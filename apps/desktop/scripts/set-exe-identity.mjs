#!/usr/bin/env node
// set-exe-identity.mjs — stamp the Hermes icon + version metadata onto the
// built Hermes.exe using rcedit, completely decoupled from electron-builder's
// signing path.
//
// WHY THIS EXISTS
// ---------------
// apps/desktop/package.json sets build.win.signAndEditExecutable=false. That
// flag is load-bearing: turning electron-builder's own exe-editing ON also
// re-enables its signtool step, which fetches winCodeSign-2.6.0.7z, whose
// macOS symlinks crash 7-Zip on non-admin Windows (no Developer Mode = no
// SeCreateSymbolicLinkPrivilege). That is an unfixable dead end — we do NOT
// try to extract winCodeSign.
//
// The cost of disabling signAndEditExecutable is that electron-builder also
// skips rcedit, so the unpacked Hermes.exe keeps the stock Electron icon and
// "Electron" taskbar name. This script restores the icon + identity by calling
// rcedit DIRECTLY. rcedit is a pure PE resource editor: no signing, no certs,
// no winCodeSign, no symlinks.
//
// HOW IT RUNS
// -----------
// Primarily as an electron-builder `afterPack` hook (scripts/after-pack.mjs),
// so EVERY packed build — first install, `hermes desktop`, the installer's
// --update rebuild, or a dev's manual `npm run pack` — gets a branded exe from
// one place. Previously this stamp lived only in install.ps1, so the update
// path (which rebuilds via `hermes desktop --build-only`, never install.ps1)
// shipped a stock "Electron" exe. Keeping it in afterPack closes that gap.
//
// Also runnable standalone for ad-hoc re-stamping:
//   node scripts/set-exe-identity.mjs <path-to-Hermes.exe>
//
// Exits 0 on success, non-zero on failure when run as a CLI. As a hook,
// stampExeIdentity() resolves on success and rejects on failure; the caller
// (after-pack.mjs) swallows the rejection so a stamp failure never fails an
// otherwise-good build (worst case: stock icon, not a broken app).

import { existsSync } from 'node:fs'
import { chmod, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'

import { NtExecutable, NtExecutableResource } from 'pe-library'
import { rcedit } from 'rcedit'
import { Data, Resource } from 'resedit'

import { isMain } from './utils.mjs'

// Stamp the Hermes icon + identity onto `exe`. Resolves on success, throws on
// failure. `desktopRoot` defaults to this script's package root so the icon and
// the rcedit dependency resolve regardless of cwd.
async function stampExeIdentityPureJs(exe, icon) {
  const source = await readFile(exe)
  const parsed = NtExecutable.from(source, { ignoreCert: true })
  const resources = NtExecutableResource.from(parsed)
  const iconFile = Data.IconFile.from(await readFile(icon))
  const group = resources.entries.find(entry => entry.type === 14)

  Resource.IconGroupEntry.replaceIconsForResource(
    resources.entries,
    typeof group?.id === 'number' ? group.id : 1,
    typeof group?.lang === 'number' ? group.lang : 1033,
    iconFile.icons.map(item => item.data)
  )

  for (const versionInfo of Resource.VersionInfo.fromEntries(resources.entries)) {
    versionInfo.setStringValues(
      { lang: 1033, codepage: 1200 },
      {
        ProductName: '萌学伴',
        FileDescription: '萌学伴 Desktop',
        CompanyName: 'MengXueBan',
        LegalCopyright: 'MengXueBan Desktop · Powered by Hermes Agent'
      }
    )
    versionInfo.outputToResourceEntries(resources.entries)
  }

  resources.outputResource(parsed)
  const output = `${exe}.mxb-stamped`
  const mode = (await stat(exe)).mode

  try {
    await writeFile(output, Buffer.from(parsed.generate()))
    await chmod(output, mode)
    await rename(output, exe)
  } catch (error) {
    await unlink(output).catch(() => undefined)
    throw error
  }
}

async function stampExeIdentity(exe, desktopRoot = resolve(import.meta.dirname, '..')) {
  if (!exe || !existsSync(exe)) {
    throw new Error(`target exe not found: ${exe}`)
  }

  // Icon lives at apps/desktop/assets/icon.ico
  const icon = join(desktopRoot, 'assets', 'icon.ico')
  if (!existsSync(icon)) {
    throw new Error(`icon not found: ${icon}`)
  }

  console.log(`[set-exe-identity] stamping ${exe}`)
  console.log(`[set-exe-identity] icon: ${icon}`)

  if (process.platform === 'win32') {
    try {
      await rcedit(exe, {
        icon,
        'version-string': {
          ProductName: '萌学伴',
          FileDescription: '萌学伴 Desktop',
          CompanyName: 'MengXueBan',
          LegalCopyright: 'MengXueBan Desktop · Powered by Hermes Agent'
        }
      })
    } catch (error) {
      console.warn(`[set-exe-identity] rcedit failed (${error.message}); using the portable PE editor`)
      await stampExeIdentityPureJs(exe, icon)
    }
  } else {
    // rcedit shells out through Wine on macOS/Linux. The pure-JS path keeps
    // cross-built Windows packages branded without requiring Wine.
    await stampExeIdentityPureJs(exe, icon)
  }

  console.log('[set-exe-identity] done — MengXueBan icon + identity stamped')
}

export { stampExeIdentity }

// CLI entry point: `node scripts/set-exe-identity.mjs <exe>`.
if (isMain(import.meta.url)) {
  const exe = process.argv[2]
  if (!exe) {
    console.error('[set-exe-identity] usage: set-exe-identity.mjs <path-to-exe>')
    process.exit(2)
  }
  stampExeIdentity(exe).catch(err => {
    console.error(`[set-exe-identity] ${err.message}`)
    process.exit(1)
  })
}

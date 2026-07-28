// Resolve electronDist at runtime (#38673, #47917): electron-builder 26.8.x can
// re-unpack a broken Electron.app; reusing the installed dist dodges that.
// npm workspace hoisting is non-deterministic — require.resolve finds electron
// wherever it landed. Dist present → -c.electronDist=<abs>/dist; absent → let
// electron-builder fetch via @electron/get (electronVersion + ELECTRON_MIRROR).

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function electronDistDir() {
  try {
    return path.join(path.dirname(require.resolve('electron/package.json')), 'dist')
  } catch {
    return null
  }
}

function requestedPlatform(argv) {
  if (argv.some(arg => arg === '--win' || arg === '-w' || arg.startsWith('--win='))) {
    return 'win32'
  }
  if (argv.some(arg => arg === '--mac' || arg === '-m' || arg.startsWith('--mac='))) {
    return 'darwin'
  }
  if (argv.some(arg => arg === '--linux' || arg === '-l' || arg.startsWith('--linux='))) {
    return 'linux'
  }
  return process.platform
}

function distBinary(dist, platform) {
  if (platform === 'darwin') {
    return path.join(dist, 'Electron.app', 'Contents', 'MacOS', 'Electron')
  }
  if (platform === 'win32') {
    return path.join(dist, 'electron.exe')
  }
  return path.join(dist, 'electron')
}

function electronBuilderCli() {
  const pkgJson = require.resolve('electron-builder/package.json')
  const bin = require(pkgJson).bin
  const rel = typeof bin === 'string' ? bin : bin['electron-builder']
  return path.join(path.dirname(pkgJson), rel)
}

const dist = electronDistDir()
const builderArgs = process.argv.slice(2)
const targetPlatform = requestedPlatform(builderArgs)
const args = []
// A locally installed Electron runtime is only reusable for its own platform.
// During macOS -> Windows cross-builds, pointing electron-builder at the mac
// dist silently copies Electron.app payloads and later fails looking for
// electron.exe. Let @electron/get fetch the correct target runtime instead.
if (targetPlatform === process.platform && dist && fs.existsSync(distBinary(dist, targetPlatform))) {
  args.push(`-c.electronDist=${dist}`)
} else {
  console.warn(
    `[run-electron-builder] no reusable local Electron dist for ${targetPlatform}; electron-builder will fetch ` +
      'via @electron/get (electronVersion + ELECTRON_MIRROR).'
  )
}
args.push(...builderArgs)

const result = spawnSync(process.execPath, [electronBuilderCli(), ...args], {
  stdio: 'inherit'
})
if (result.error) {
  console.error(`[run-electron-builder] spawn failed: ${result.error.message}`)
  process.exit(1)
}
process.exit(result.status == null ? 1 : result.status)

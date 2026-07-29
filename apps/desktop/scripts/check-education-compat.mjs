import { existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const desktopRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const quick = process.argv.includes('--quick')
const baselinePath = resolve(desktopRoot, 'education-upstream-baseline.json')

function fail(message) {
  console.error(`[education-compat] ${message}`)
  process.exit(1)
}

function run(label, command, args) {
  console.log(`\n[education-compat] ${label}`)

  const result = spawnSync(command, args, {
    cwd: desktopRoot,
    env: process.env,
    shell: process.platform === 'win32',
    stdio: 'inherit'
  })

  if (result.error) {
    fail(`${label} could not start: ${result.error.message}`)
  }

  if (result.status !== 0) {
    fail(`${label} failed with exit code ${result.status ?? 'unknown'}`)
  }
}

if (!existsSync(baselinePath)) {
  fail(`missing baseline: ${baselinePath}`)
}

let baseline

try {
  baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
} catch (error) {
  fail(`invalid baseline JSON: ${error instanceof Error ? error.message : String(error)}`)
}

const requiredStrings = [
  ['product.commit', baseline?.product?.commit],
  ['product.desktopVersion', baseline?.product?.desktopVersion],
  ['product.hermesCoreVersion', baseline?.product?.hermesCoreVersion],
  ['officialUpstream.head', baseline?.officialUpstream?.head],
  ['officialUpstream.mergeBase', baseline?.officialUpstream?.mergeBase],
  ['educationExtension.executionBoundary', baseline?.educationExtension?.executionBoundary]
]

for (const [name, value] of requiredStrings) {
  if (typeof value !== 'string' || !value.trim()) {
    fail(`baseline field ${name} must be a non-empty string`)
  }
}

if (!Array.isArray(baseline.educationExtension.firstReleaseScenarios)) {
  fail('baseline field educationExtension.firstReleaseScenarios must be an array')
}

console.log(
  `[education-compat] baseline product=${baseline.product.commit.slice(0, 12)} ` +
    `upstream=${baseline.officialUpstream.head.slice(0, 12)} ` +
    `behind=${baseline.officialUpstream.commitsBehind}`
)

if (!quick) {
  run('TypeScript contracts', 'npm', ['run', 'typecheck'])
}

const testTargets = [
  'src/app/routes.test.ts',
  'src/app/routes.workspace-reveal.test.ts',
  'src/app/session/hooks/use-route-resume.test.tsx',
  'src/app/artifacts/index.test.ts',
  'src/i18n/context.test.tsx',
  'src/i18n/runtime.test.ts',
  'src/i18n/languages.test.ts',
  'src/app/education'
].filter(target => existsSync(resolve(desktopRoot, target)))

run('Education compatibility tests', 'npm', ['exec', '--', 'vitest', 'run', '--project', 'ui', ...testTargets])

console.log('\n[education-compat] all checks passed')

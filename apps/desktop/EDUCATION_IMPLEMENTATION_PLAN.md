# Plan: 萌学伴教研场景工作台第一期

**Generated**: 2026-07-28  
**Status**: In progress; Sprints 0–2 and the local task-confirmation flow are implemented  
**Estimated Complexity**: High  
**Product design**: [`EDUCATION_SCENARIOS.md`](./EDUCATION_SCENARIOS.md)  
**Design contract**: [`DESIGN.md`](./DESIGN.md#mengxueban-education-workspace-extension)

## 1. Implementation lock

The following decisions are the implementation baseline. A decision marked
`later` is explicitly outside the first release and must not be smuggled into a
task as incidental scope.

| Decision | First-release choice | Later |
| --- | --- | --- |
| Primary users | 学科教师、教研员、内容运营 | Role-specific home layouts |
| Primary entry | 任务导向首页 | Assistant-first or source-first home |
| Primary navigation | 首页、对话、任务、数据来源、产物 | Separate public nav for scene/template management |
| Initial scenarios | 教材课程树、学科知识点树、文档整理 | 专项突破、专题研究、备课包、定时追踪 |
| Public role/scene editing | Public templates are read-only; any user can copy to “我的” and edit | Institution publishing workflow |
| Template updates | Built-ins receive product updates; personal copies are never overwritten | Interactive three-way merge |
| Source labels | 学科网、知识库、联网搜索、我的文件、已配置教材来源 | Provider marketplace |
| Hidden provider names | Do not show 教研云 or RAGFlow in teacher-facing UI | Provider name is available only in administrator technical details |
| Task scope | Current connected Hermes Gateway and active profile | Aggregation across operator + mxb001–mxb004 |
| Administration | Same shell; technical management lives under advanced capabilities/settings | Separate administrator application |
| Runtime boundary | Desktop education feature composes existing Hermes APIs | No new Hermes core model tool |
| Persistence | Desktop-owned local storage, connection/profile-scoped education records | Shared remote organization repository |
| Mapping policy | Only use explicit source mapping evidence | No name-based textbook/knowledge guessing |

## 2. Architecture approach

Keep the education product at the desktop edge:

```text
apps/desktop/src/app/education
  domain/          role, scene, task, source and artifact contracts
  repository/      desktop-owned persistence scoped by gateway/profile
  runtime/         adapters from education tasks to Hermes session/goal APIs
  home/            task-oriented home
  tasks/           creation, confirmation, progress and task detail
  sources/         teacher-facing source capability centre
  templates/       built-in and personal roles/scenes
  scenarios/       three first-release scenario definitions
```

The feature uses existing full-page/contributed-route and sidebar contribution
seams. It does not modify the Python agent loop, model-tool schema, prompt cache,
Skills implementation, Cron implementation, or Artifacts extraction.

Education records keep explicit references to the Hermes identities they wrap:

- connection scope;
- profile;
- stable stored session id;
- runtime session id when present;
- lineage root;
- goal id when present;
- artifact paths/URLs.

An education task is not the source of truth for agent execution. Hermes remains
authoritative for session and goal state; the education repository owns only the
business inputs, resolved scene/template snapshot, teacher-facing status, and
artifact grouping.

## 3. Sprint 0: Freeze boundaries and upstream baseline

**Goal**: Prove the extension seam and record an official-Hermes baseline before
feature work begins.

**Demo/Validation**:

- Current Desktop starts and existing Chat, Skills, Messaging and Artifacts open.
- A minimal contributed test page can be registered and removed without changing
  Chat behavior.
- Upstream/base commit and current product commit are recorded.

### Task 0.1: Record upgrade baseline

- **Location**: `apps/desktop/education-upstream-baseline.json` (new)
- **Description**: Record upstream remote, upstream commit, product base commit,
  Desktop package version, supported gateway version/capabilities, and validation
  date. Do not record credentials or host secrets.
- **Dependencies**: None
- **Acceptance Criteria**:
  - File is machine-readable and contains no environment-specific secret.
  - A maintainer can identify the exact base used for the first release.
- **Validation**: Parse the file in a unit test or a small repository script.

### Task 0.2: Prove the page contribution seam

- **Location**: existing contribution registry under `apps/desktop/src/contrib/`
  and a temporary test contribution
- **Description**: Add a test demonstrating that education routes and sidebar
  entries can be registered through the existing areas without adding education
  nouns to Hermes core route classification.
- **Dependencies**: Task 0.1
- **Acceptance Criteria**:
  - Contributed route is classified as a workspace page, not a chat session.
  - Opening/closing the route preserves the foreground chat and does not steal
    focus on background updates.
  - The proof is a test, not a permanent demo route.
- **Validation**: Extend `apps/desktop/src/app/routes.test.ts` and
  `routes.workspace-reveal.test.ts`.

### Task 0.3: Add an education compatibility smoke command

- **Location**: `apps/desktop/scripts/check-education-compat.mjs` (new),
  `apps/desktop/package.json`
- **Description**: Add one command that runs route/contribution, education domain,
  task-resume, artifact-linking, typecheck, and locale completeness checks.
- **Dependencies**: Task 0.2
- **Acceptance Criteria**:
  - Command initially passes on the baseline with education tests absent/empty.
  - Later sprints only add tests to the same command; release instructions do not
    invent a second checklist.
- **Validation**: Run the command locally and in CI.

## 4. Sprint 1: Domain contracts and persistence

**Goal**: Create a stable, testable business model without UI or live execution.

**Demo/Validation**:

- Seed built-in roles/scenes, copy them to personal objects, edit personal copies,
  and reload them from a connection/profile-scoped repository.
- Migrate a fixture from schema version 1 to the current schema.

### Task 1.1: Define role and scene contracts

- **Location**:
  - `apps/desktop/src/app/education/domain/role.ts`
  - `apps/desktop/src/app/education/domain/scene.ts`
- **Description**: Define `RoleTemplate`, `ScenePackage`, ownership (`builtin` or
  `personal`), immutable built-in id, version, clone origin, intake schema, source
  requirements, assistant binding, output contracts, and update metadata.
- **Dependencies**: Sprint 0
- **Acceptance Criteria**:
  - Built-ins cannot be mutated by domain actions.
  - Personal copies receive new ids and retain `clonedFrom` plus source version.
  - Scene execution always snapshots resolved role and scene versions.
- **Validation**: Pure unit tests for create, copy, edit and version comparison.

### Task 1.2: Define task state and identity contracts

- **Location**: `apps/desktop/src/app/education/domain/task.ts`
- **Description**: Define draft inputs, resolved scope, source bindings, Hermes
  identity references, progress steps, waiting question, failure classification,
  partial result, artifact references and terminal states.
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - Supports `draft`, `ready`, `queued`, `running`, `waiting_input`, `partial`,
    `completed`, `failed`, and `cancelled`.
  - Missing lower volume can be represented as a normal scoped absence rather
    than a generic failure.
  - `waiting_input` preserves all previous task inputs and candidate evidence.
- **Validation**: Transition-table tests reject invalid transitions.

### Task 1.3: Define teacher-facing source contracts

- **Location**: `apps/desktop/src/app/education/domain/source.ts`
- **Description**: Define source capability (`catalogue`, `search`, `read`,
  `refresh`), supported scope, source state, teacher label and optional technical
  provider detail.
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - Teacher serializer cannot emit “教研云” or “RAGFlow”.
  - RAGFlow-backed providers serialize as “知识库”.
  - Unsupported scope, authentication required, degraded and unreachable remain
    distinguishable.
- **Validation**: Golden serialization tests in Chinese.

### Task 1.4: Implement connection/profile-scoped repository

- **Location**:
  - `apps/desktop/src/app/education/repository/education-repository.ts`
  - `apps/desktop/src/app/education/repository/desktop-repository.ts`
- **Description**: Persist personal roles, scenes and task metadata as a single
  versioned local-storage value under an explicit connection/profile namespace.
  Built-ins remain bundled immutable assets. A complete `setItem` replacement
  is the atomic commit boundary; write errors must surface and preserve the
  prior value. This avoids a new Electron/core IPC seam for first release.
- **Dependencies**: Tasks 1.1–1.3
- **Acceptance Criteria**:
  - Switching profile or connection cannot leak personal data into another scope.
  - Failed writes surface and leave the prior snapshot intact.
  - No secret, document body or model response is duplicated into task metadata.
- **Validation**: Temp-directory integration tests, including corrupt-file and
  rollback cases.

### Task 1.5: Add schema migration and fixtures

- **Location**:
  - `apps/desktop/src/app/education/repository/migrations.ts`
  - `apps/desktop/src/app/education/__fixtures__/`
- **Description**: Add monotonic schema versioning and migration fixtures before
  the first production record exists.
- **Dependencies**: Task 1.4
- **Acceptance Criteria**:
  - Older records upgrade without changing ids or historical scene snapshots.
  - Unknown newer schema fails with a clear compatibility message.
- **Validation**: Migration round-trip tests.

## 5. Sprint 2: Education shell and task-oriented Home

**Goal**: Deliver a navigable, read-only product shell backed by fixtures.

**Demo/Validation**:

- Open 首页、任务、数据来源 and existing 产物 pages.
- Home shows recommended scenarios, continuing tasks, recent artifacts and source
  availability without exposing technical provider names.

### Task 2.1: Register education pages and navigation

- **Location**:
  - `apps/desktop/src/app/education/contribution.tsx`
  - `apps/desktop/src/app/education/routes.ts`
  - existing contribution bootstrap only where registration is required
- **Description**: Register `/home`, `/tasks`, `/sources`, and secondary
  `/templates` routes plus 首页/任务/数据来源 sidebar entries. Reuse existing
  Artifacts route.
- **Dependencies**: Sprint 1
- **Acceptance Criteria**:
  - Existing Chat route continues to work unchanged.
  - Background task/source updates do not navigate or focus the page.
  - Active route styling and keyboard navigation work.
- **Validation**: Route and sidebar contribution tests.

### Task 2.2: Build fixture-backed Home

- **Location**: `apps/desktop/src/app/education/home/`
- **Description**: Implement intent entry, three pinned scenarios, continuing
  tasks, recent artifacts and compact source status using existing primitives.
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - “今天想完成什么” classifies/suggests but does not auto-run.
  - Home contains no nested card hierarchy or technical model/Profile wording.
  - Empty, loading, degraded and populated states are distinct.
- **Validation**: Component tests at wide, medium and narrow widths.

### Task 2.3: Build read-only Task and Source pages

- **Location**:
  - `apps/desktop/src/app/education/tasks/index.tsx`
  - `apps/desktop/src/app/education/sources/index.tsx`
- **Description**: Render repository fixtures grouped by “需要我处理、进行中、
  已完成”; render sources by friendly capability and state.
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - Partial and waiting tasks have direct actions.
  - Source rows answer what the source can do, supported scope and current state.
  - Provider implementation appears only inside an administrator technical detail
    disclosure.
- **Validation**: State matrix tests and accessibility queries.

### Task 2.4: Add all locale entries

- **Location**: every supported catalogue under `apps/desktop/src/i18n/`
- **Description**: Add education nouns and state copy through the existing i18n
  contract; Simplified Chinese is the product reference wording.
- **Dependencies**: Tasks 2.1–2.3
- **Acceptance Criteria**:
  - No user-facing education string literal remains in JSX.
  - Locale type/catalogue tests pass for all currently supported locales.
- **Validation**: Existing i18n tests plus a forbidden-provider-name test for the
  Chinese teacher surface.

## 6. Sprint 3: Roles, scenes and safe customization

**Goal**: Let every user create and edit personal roles/scenes without mutating
public templates.

**Demo/Validation**:

- Copy “教材结构助手”, rename it, adjust allowed capabilities, save it, and use
  it in a copied personal scene.
- Simulate a built-in template update and show “有新版本” without overwriting the
  personal copy.

### Task 3.1: Seed four built-in role templates

- **Location**: `apps/desktop/src/app/education/templates/builtin-roles.ts`
- **Description**: Seed 教材结构助手、教研资料助手、文档整理助手、备课助手 as
  immutable product templates mapped to profile seed, SOUL, model policy and
  capabilities.
- **Dependencies**: Sprint 2
- **Acceptance Criteria**:
  - Mapping is resolved before a new session starts.
  - Built-in templates remain usable after an official Hermes model/tool change
    through capability resolution rather than hard-coded tool internals.
- **Validation**: Resolution tests against supported capability fixtures.

### Task 3.2: Seed three built-in scene packages

- **Location**: `apps/desktop/src/app/education/scenarios/`
- **Description**: Add versioned definitions for 教材课程树、学科知识点树 and
  文档整理, including intake fields, source requirements, confirmation rules and
  artifact contracts.
- **Dependencies**: Task 3.1
- **Acceptance Criteria**:
  - Knowledge tree defaults to stage + subject, not textbook/grade.
  - Course tree requires grade, subject, exact edition and volume scope.
  - Document scene requires a clear purpose before creation.
- **Validation**: Schema and required-field tests for each scene.

### Task 3.3: Implement copy-and-edit UI

- **Location**: `apps/desktop/src/app/education/templates/`
- **Description**: Provide built-in/personal segmentation, copy, create, edit,
  delete-personal, version notice and technical details.
- **Dependencies**: Tasks 3.1–3.2
- **Acceptance Criteria**:
  - No edit/delete action appears for a built-in object.
  - Copy produces an editable personal object and preserves origin metadata.
  - Editing a role/scene never changes an already running task.
- **Validation**: User-flow tests for copy, edit, delete and update notice.

## 7. Sprint 4: Task creation and Hermes execution bridge

**Goal**: Create, run, pause for confirmation, resume and complete one fixture
scene through real Hermes session/goal APIs.

**Demo/Validation**:

- Create a course-tree task, resolve an ambiguous edition, watch business-level
  progress, and open the resulting artifact and underlying chat.

### Task 4.1: Implement the five-step TaskIntake

- **Location**: `apps/desktop/src/app/education/tasks/create/`
- **Description**: Implement 目标 → 范围 → 数据来源 → 产物 → 确认 from a scene's
  intake schema. Keep advanced runtime details collapsed.
- **Dependencies**: Sprint 3
- **Acceptance Criteria**:
  - Final summary is a readable Chinese sentence.
  - Missing purpose or required scope keeps the task in draft.
  - No costly run starts before explicit confirmation.
- **Validation**: Field, keyboard, responsive and draft-resume tests.

### Task 4.2: Implement ambiguity confirmation

- **Location**: `apps/desktop/src/app/education/tasks/confirm/`
- **Description**: Render two to five source-backed candidates with edition,
  year, school system, volume availability and source evidence.
- **Dependencies**: Task 4.1
- **Acceptance Criteria**:
  - Never guesses among 沪教版/沪教版（五四制）/沪教版（2025）.
  - Selection resumes the same task lineage with all previous inputs.
- **Validation**: Candidate fixture tests and resume identity assertion.

### Task 4.3: Build the Hermes runtime adapter

- **Location**: `apps/desktop/src/app/education/runtime/hermes-task-adapter.ts`
- **Description**: Start a new session from the resolved role before execution,
  create/associate a goal where supported, invoke the scene, normalize observable
  progress, and reconcile terminal states.
- **Dependencies**: Tasks 4.1–4.2
- **Acceptance Criteria**:
  - Does not mutate tools/SOUL/model of an existing session.
  - Stores stable, runtime and lineage identities explicitly.
  - A stale/background update cannot overwrite the foreground task.
- **Validation**: Adapter contract tests for current and older-capability gateway
  fixtures, then one real local gateway smoke test.

### Task 4.4: Link tasks and artifacts

- **Location**:
  - education task detail components
  - narrow metadata extension around existing Artifacts collection
- **Description**: Associate openable/downloadable artifacts with a task and
  scenario while preserving the existing artifact source/session behavior.
- **Dependencies**: Task 4.3
- **Acceptance Criteria**:
  - Completed is shown only when required artifact contracts are satisfied.
  - User can open artifact, originating task and underlying chat.
  - Missing optional lower-volume artifact produces an explained result, not a
    fabricated sheet.
- **Validation**: Artifact extraction/link tests with local and remote file paths.

### Task 4.5: Implement bounded retry and recovery actions

- **Location**: `apps/desktop/src/app/education/runtime/recovery.ts`
- **Description**: Classify source unavailable, authentication, timeout, rate
  limit, unsupported scope, invalid response and artifact validation failure;
  provide retry-step, change-source and keep-partial-result actions.
- **Dependencies**: Task 4.3
- **Acceptance Criteria**:
  - No infinite retry or generic whole-task failure for a single-source error.
  - Recovery preserves successful source outputs.
- **Validation**: Deterministic failure-matrix tests.

## 8. Sprint 5: Three real first-release scenarios

**Goal**: Replace fixtures with real, end-to-end education outputs.

**Demo/Validation**:

- Each scene starts from Home, creates a task, executes against an allowed source,
  produces an openable artifact and links back to its task/chat.

### Task 5.1: Integrate textbook course tree

- **Location**: education scene definition plus existing managed Xueke/source
  Skill adapter; do not copy site logic into React
- **Description**: Bind grade/subject/edition/volume inputs to the source Skill and
  normalize workbook artifacts.
- **Dependencies**: Sprint 4
- **Acceptance Criteria**:
  - Multiple editions trigger confirmation.
  - Upper/lower acquisition is independent.
  - A genuinely absent lower volume is clearly noted as normal source scope.
  - Workbook remains readable and retains ids/import fields.
- **Validation**: Replay fixtures plus one authorized live read and workbook
  structural/readability verification.

### Task 5.2: Integrate subject knowledge tree

- **Location**: education scene definition plus source Skill adapter
- **Description**: Bind stage + subject inputs and export the source knowledge tree
  without forcing grade or textbook constraints.
- **Dependencies**: Sprint 4
- **Acceptance Criteria**:
  - Grade/textbook filters appear only when the source explicitly supports them.
  - No course-to-knowledge mapping is created from matching names.
- **Validation**: Multi-stage/multi-subject replay matrix and workbook validation.

### Task 5.3: Integrate document organization

- **Location**: education document scene and existing file/vision capabilities
- **Description**: Route images/scanned PDF pages to the configured vision API;
  preserve extractable structure for text PDF/Word before model interpretation.
- **Dependencies**: Sprint 4
- **Acceptance Criteria**:
  - No local OCR deployment or user-facing OCR mode is required.
  - Source file/page references survive into structured outputs.
  - A mixed batch may finish partially with a per-file explanation.
- **Validation**: Image, scanned PDF, text PDF, Word and mixed-batch fixtures plus
  real API smoke within configured limits.

## 9. Sprint 6: Official-update compatibility and release readiness

**Goal**: Prove the product can follow official Hermes updates without rewriting
education scenarios or overwriting user customization.

**Demo/Validation**:

- Rebase/merge a representative upstream update in a throwaway branch.
- Run the compatibility command and the three end-to-end scenes.
- Show that built-ins update, personal copies remain unchanged, and historical
  tasks still open.

### Task 6.1: Add capability negotiation

- **Location**: `apps/desktop/src/app/education/runtime/capabilities.ts`
- **Description**: Resolve required scene capabilities from the connected gateway
  and expose available/degraded/unsupported before task creation.
- **Dependencies**: Sprint 5
- **Acceptance Criteria**:
  - Scene definitions depend on semantic capabilities, not internal component or
    tool implementation names.
  - Older gateways disable unsupported actions with an explanation.
- **Validation**: Version/capability fixture matrix.

### Task 6.2: Add built-in update comparison

- **Location**: education template repository and update UI
- **Description**: Compare bundled built-in version against personal clone origin;
  show update notice, preserve personal copy, and allow fresh copy creation.
- **Dependencies**: Sprint 5
- **Acceptance Criteria**:
  - Product update never mutates a personal role or scene.
  - Historical tasks retain their original snapshots.
- **Validation**: Upgrade fixture from built-in v1 to v2.

### Task 6.3: Add upstream integration workflow

- **Location**: repository CI/workflow or documented local release script,
  depending on existing project convention
- **Description**: Fetch official upstream, create a temporary integration branch,
  run typecheck/lint/tests/build/education compatibility, and produce a conflict
  and failed-contract report. Do not auto-publish.
- **Dependencies**: Tasks 6.1–6.2
- **Acceptance Criteria**:
  - Official update testing is repeatable and non-destructive.
  - Failures identify route, gateway API, profile/session, artifact or locale
    contract rather than reporting only “build failed”.
- **Validation**: Dry-run against current upstream and archive the report artifact.

### Task 6.4: Complete release candidate validation

- **Location**: release checklist and automated tests
- **Description**: Exercise teacher Home, personal template editing, all three
  scenarios, remote gateway reconnect, artifact open/download and rollback.
- **Dependencies**: Tasks 6.1–6.3
- **Acceptance Criteria**:
  - Local tests, packaged Desktop, gateway connection and business outputs are
    recorded separately.
  - No remote deployment occurs until explicitly authorized.
- **Validation**: Signed validation record with base/update commits and artifact
  samples; keep secrets redacted.

## 10. Testing strategy

- **Pure domain tests**: ownership, cloning, versioning, state transitions,
  provider-label filtering and task snapshot immutability.
- **Repository tests**: scope isolation, migrations, atomic writes and corruption
  recovery using temporary directories.
- **Component tests**: task intake, confirmation, task states, source states,
  keyboard behavior and responsive layouts.
- **Adapter tests**: session identity mapping, goal capability fallback, stale
  update ordering, retries and partial results.
- **Scenario replay tests**: stable fixtures for course tree, knowledge tree and
  document batches.
- **Real smoke tests**: one local gateway run per sprint that touches runtime;
  authorized live source/API checks only in Sprint 5/release candidate.
- **Release checks**: `npm run typecheck`, lint, UI/Electron tests, package smoke,
  education compatibility command and `git diff --check`.

## 11. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Official Desktop routes/components change | Keep education code in one feature directory; use contribution seams; run upstream integration before release |
| Gateway lacks Goal or metadata capability | Capability negotiation and session-backed fallback; never pretend unsupported state is synchronized |
| Personal template is overwritten | Immutable built-ins, copy-on-customize, versioned repository, upgrade fixtures |
| Task status drifts from Hermes session | Hermes remains execution authority; reconcile by explicit stable/runtime/lineage identities |
| Provider name leaks into teacher UI | Teacher serializer and locale tests reject hidden implementation names |
| Source ambiguity produces wrong textbook | Waiting confirmation state with source-backed candidates |
| One failed semester/file loses whole task | First-class partial result and per-step recovery |
| Structured metadata conflicts with readable output | Keep readable main workbook/tree and retain ids/import fields without replacing it |
| First release grows into a workflow platform | Ship only three proven scenes; require a second real consumer before generalizing any editor contract |

## 12. Rollback plan

- Education pages are registered at the desktop edge. Disable their contribution
  registration to return to the original Chat/Skills/Messaging/Artifacts shell.
- Keep education repository schema append-only and back up its scoped data before
  migration. Rollback restores the prior file and bundled template version.
- Do not modify or migrate Hermes core session history for first-release tasks.
- Official-update trials occur in a disposable integration branch. A failed trial
  is discarded without changing the release branch or remote instances.
- Remote publication, service restart and data migration require a separate,
  explicit release authorization.

## 13. Ready-to-start checklist

- [x] Product information architecture confirmed.
- [x] Teacher-facing source naming confirmed.
- [x] Built-in versus personal editing model confirmed.
- [x] Three first-release scenarios identified.
- [x] Official-update isolation strategy defined.
- [x] No Hermes core modification planned.
- [ ] Confirm whether first release should aggregate tasks across gateways.
- [ ] Confirm whether 专项突破 moves into first release.
- [ ] Confirm whether institution-shared publishing is required in first release.

Unless one of the final three items changes, implementation should start at
Sprint 0 and proceed in order. The recommended defaults are: no cross-gateway
aggregation, 专项突破 in the next increment, and institution publishing later.

import type { SceneExecutionSnapshot } from './scene'

export type EducationTaskState =
  | 'cancelled'
  | 'completed'
  | 'draft'
  | 'failed'
  | 'partial'
  | 'queued'
  | 'ready'
  | 'running'
  | 'waiting_input'

export interface TaskHermesIdentity {
  connectionScope: string
  profile: string
  goalId?: string
  lineageRootId?: string
  runtimeSessionId?: string
  storedSessionId?: string
}

export interface TaskCandidateEvidence {
  label: string
  sourceId: string
  value: string
  details: Record<string, string>
}

export interface TaskWaitingQuestion {
  fieldId: string
  prompt: string
  candidates: TaskCandidateEvidence[]
}

export interface TaskArtifactReference {
  id: string
  label: string
  mediaType: string
  required: boolean
  value: string
}

export interface TaskScopeAbsence {
  code: 'not_provided_by_source' | 'unsupported_scope'
  label: string
  sourceId: string
}

export interface EducationTask {
  id: string
  title: string
  state: EducationTaskState
  sceneSnapshot: SceneExecutionSnapshot | null
  inputs: Record<string, unknown>
  sourceBindings: string[]
  hermes: TaskHermesIdentity | null
  waitingQuestion: TaskWaitingQuestion | null
  artifacts: TaskArtifactReference[]
  scopeAbsences: TaskScopeAbsence[]
  failureCode: string | null
  createdAt: string
  updatedAt: string
}

const ALLOWED_TRANSITIONS: Record<EducationTaskState, ReadonlySet<EducationTaskState>> = {
  cancelled: new Set(),
  completed: new Set(),
  draft: new Set(['ready', 'cancelled']),
  failed: new Set(['queued', 'cancelled']),
  partial: new Set(['queued', 'completed', 'failed', 'cancelled']),
  queued: new Set(['running', 'failed', 'cancelled']),
  ready: new Set(['queued', 'cancelled']),
  running: new Set(['waiting_input', 'partial', 'completed', 'failed', 'cancelled']),
  waiting_input: new Set(['queued', 'running', 'failed', 'cancelled'])
}

export function createDraftTask(input: Pick<EducationTask, 'id' | 'title' | 'createdAt'>): EducationTask {
  return {
    id: input.id,
    title: input.title,
    state: 'draft',
    sceneSnapshot: null,
    inputs: {},
    sourceBindings: [],
    hermes: null,
    waitingQuestion: null,
    artifacts: [],
    scopeAbsences: [],
    failureCode: null,
    createdAt: input.createdAt,
    updatedAt: input.createdAt
  }
}

export function canTransitionTask(from: EducationTaskState, to: EducationTaskState): boolean {
  return ALLOWED_TRANSITIONS[from].has(to)
}

export function transitionTask(
  task: EducationTask,
  state: EducationTaskState,
  now: string,
  patch: Partial<Omit<EducationTask, 'id' | 'state' | 'createdAt' | 'updatedAt'>> = {}
): EducationTask {
  if (!canTransitionTask(task.state, state)) {
    throw new Error(`Invalid education task transition: ${task.state} -> ${state}`)
  }

  const waitingQuestion = state === 'waiting_input' ? (patch.waitingQuestion ?? task.waitingQuestion) : null

  if (state === 'waiting_input' && !waitingQuestion) {
    throw new Error('waiting_input requires a waiting question')
  }

  return {
    ...task,
    ...patch,
    state,
    waitingQuestion,
    updatedAt: now
  }
}

export function taskHasRequiredArtifacts(task: EducationTask): boolean {
  const requiredContracts = task.sceneSnapshot?.scene.outputContracts.filter(contract => contract.required) ?? []

  return requiredContracts.every(contract =>
    task.artifacts.some(artifact => artifact.id === contract.id && Boolean(artifact.value.trim()))
  )
}

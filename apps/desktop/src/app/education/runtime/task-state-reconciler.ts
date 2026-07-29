import type { ClientSessionState } from '@/app/types'

import { type EducationTask, transitionTask } from '../domain/task'

export interface TaskClarifyRequest {
  choices: string[] | null
  question: string
  requestId: string
}

function stateForTask(task: EducationTask, states: Record<string, ClientSessionState>): ClientSessionState | null {
  const runtimeId = task.hermes?.runtimeSessionId

  if (runtimeId && states[runtimeId]) {
    return states[runtimeId]
  }

  const storedId = task.hermes?.storedSessionId

  return storedId ? (Object.values(states).find(state => state.storedSessionId === storedId) ?? null) : null
}

export function reconcileEducationTaskState(
  task: EducationTask,
  states: Record<string, ClientSessionState>,
  now: string,
  clarifyRequests: Record<string, TaskClarifyRequest> = {}
): EducationTask {
  const session = stateForTask(task, states)

  if (!session) {
    return task
  }

  if (task.state === 'running' && session.needsInput) {
    const request = task.hermes?.runtimeSessionId ? clarifyRequests[task.hermes.runtimeSessionId] : undefined

    return transitionTask(task, 'waiting_input', now, {
      waitingQuestion: {
        fieldId: 'hermes-session',
        prompt: request?.question ?? '执行会话需要你确认后才能继续。',
        candidates: (request?.choices ?? []).map(choice => ({
          label: choice,
          sourceId: 'hermes:clarify',
          value: choice,
          details: { request_id: request?.requestId ?? '' }
        }))
      }
    })
  }

  if (task.state === 'waiting_input' && session.busy && !session.needsInput) {
    return transitionTask(task, 'running', now)
  }

  return task
}

export function reconcileEducationTasks(
  tasks: EducationTask[],
  states: Record<string, ClientSessionState>,
  now: string,
  clarifyRequests: Record<string, TaskClarifyRequest> = {}
): EducationTask[] {
  let changed = false

  const reconciled = tasks.map(task => {
    const next = reconcileEducationTaskState(task, states, now, clarifyRequests)
    changed ||= next !== task

    return next
  })

  return changed ? reconciled : tasks
}

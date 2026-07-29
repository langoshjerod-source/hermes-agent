import { describe, expect, it, vi } from 'vitest'

import { PROMPT_SUBMIT_REQUEST_TIMEOUT_MS } from '@/hermes'

import { transitionTask } from '../domain/task'
import { prepareEducationTask } from '../domain/task-preparation'
import { BUILTIN_EDUCATION_SCENES } from '../scenarios/builtin-scenes'
import { BUILTIN_EDUCATION_ROLES } from '../templates/builtin-roles'

import {
  type EducationGatewayRequest,
  educationTaskGoal,
  inspectEducationGoalStatus,
  startEducationTask
} from './gateway-executor'

const NOW = '2026-07-29T05:00:00Z'

function queuedTask() {
  const ready = prepareEducationTask({
    id: 'task:1',
    purpose: '供老师审核并导入系统',
    scene: BUILTIN_EDUCATION_SCENES[0],
    role: BUILTIN_EDUCATION_ROLES[0],
    values: {
      edition: '沪教版',
      grade: '五年级',
      source: 'source:xueke',
      stage: '小学',
      subject: '数学',
      volumes: ['upper', 'lower']
    },
    createdAt: NOW,
    hermes: { connectionScope: 'remote:https://gateway.example', profile: 'mxb001' }
  })

  return transitionTask(ready, 'queued', NOW)
}

describe('education gateway executor', () => {
  it('builds a source-safe goal without guessing textbook mappings', () => {
    const goal = educationTaskGoal(queuedTask())

    expect(goal).toContain('purpose: 供老师审核并导入系统')
    expect(goal).toContain('教材课程树与学科知识点树是独立产物')
    expect(goal).toContain('不得自行猜测')
  })

  it('creates a Hermes session, sets a goal, and submits its kickoff', async () => {
    const requestGateway = vi.fn(async (method: string) => {
      if (method === 'session.create') {
        return { session_id: 'runtime-1', stored_session_id: 'stored-1' }
      }

      if (method === 'slash.exec') {
        return { type: 'send', notice: 'goal set', message: 'kickoff prompt' }
      }

      return { ok: true }
    })

    const running = await startEducationTask(requestGateway as EducationGatewayRequest, queuedTask(), NOW)

    expect(requestGateway.mock.calls.map(([method]) => method)).toEqual([
      'session.create',
      'slash.exec',
      'prompt.submit'
    ])
    expect(requestGateway).toHaveBeenCalledWith('session.create', {
      cols: 96,
      profile: 'mxb001',
      source: 'desktop'
    })
    expect(requestGateway).toHaveBeenCalledWith(
      'prompt.submit',
      { session_id: 'runtime-1', text: 'kickoff prompt' },
      PROMPT_SUBMIT_REQUEST_TIMEOUT_MS
    )
    expect(running.state).toBe('running')
    expect(running.hermes).toMatchObject({ runtimeSessionId: 'runtime-1', storedSessionId: 'stored-1' })
    expect(running.hermes?.goalId).toBeUndefined()
  })

  it('fails closed when Hermes does not acknowledge the goal kickoff', async () => {
    const requestGateway = vi.fn(async (method: string) =>
      method === 'session.create' ? { session_id: 'runtime-1' } : { type: 'exec', output: 'unexpected' }
    )

    await expect(startEducationTask(requestGateway as EducationGatewayRequest, queuedTask(), NOW)).rejects.toThrow(
      /kickoff message/
    )
    expect(requestGateway).not.toHaveBeenCalledWith('prompt.submit', expect.anything(), expect.anything())
  })

  it('reads the persisted Hermes goal status without inventing a goal id', async () => {
    const task = queuedTask()

    const bound = {
      ...task,
      hermes: { ...task.hermes!, runtimeSessionId: 'runtime-1', storedSessionId: 'stored-1' }
    }

    const requestGateway = vi.fn(async () => ({ output: '✓ Goal done (2/20 turns): 教材课程树' }))

    await expect(inspectEducationGoalStatus(requestGateway as EducationGatewayRequest, bound)).resolves.toBe('done')
    expect(requestGateway).toHaveBeenCalledWith('slash.exec', {
      session_id: 'runtime-1',
      command: 'goal status'
    })
  })
})

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

    expect(goal).toContain('purpose: 按场景卡已确认的结构化范围')
    expect(goal).toContain('教材课程树与学科知识点树是独立产物')
    expect(goal).toContain('不得自行猜测')
    expect(goal).toContain('xueke-textbook-knowledge-tree')
    expect(goal).toContain('SCENE_INTAKE_CONFIRMED')
  })

  it('injects the executable Air Classroom Skill contract into the task goal', () => {
    const task = queuedTask()

    const airClassroomTask = {
      ...task,
      inputs: { ...task.inputs, source: 'source:air-classroom' },
      sourceBindings: ['source:air-classroom']
    }

    const goal = educationTaskGoal(airClassroomTask)

    expect(goal).toContain('shanghai-smartedu-catalog')
    expect(goal).toContain('indexPanel 与 point/tree')
    expect(goal).toContain('第一步只整理教材目录明细')
  })

  it('injects the dedicated official-resource contract for the national platform', () => {
    const task = queuedTask()

    const nationalTask = {
      ...task,
      inputs: { ...task.inputs, source: 'source:national-smartedu' },
      sourceBindings: ['source:national-smartedu']
    }

    const goal = educationTaskGoal(nationalTask)

    expect(goal).toContain('smartedu.cn')
    expect(goal).toContain('national-smartedu-resource-catalog')
    expect(goal).toContain('不冒充教材课程树或知识点树')
    expect(goal).toContain('交付部分结果与缺口')
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

  it('stages input attachments before dispatching the goal and includes their references in kickoff', async () => {
    const task = {
      ...queuedTask(),
      inputAttachments: [
        { id: 'file:/tmp/lesson.pdf', kind: 'file' as const, label: 'lesson.pdf', path: '/tmp/lesson.pdf' }
      ],
      hermes: { ...queuedTask().hermes!, connectionScope: 'local' }
    }

    const requestGateway = vi.fn(async (method: string) => {
      if (method === 'session.create') {
        return { session_id: 'runtime-1', stored_session_id: 'stored-1' }
      }

      if (method === 'file.attach') {
        return { attached: true, ref_text: '@file:.hermes/desktop-attachments/lesson.pdf' }
      }

      if (method === 'slash.exec') {
        return { type: 'send', message: 'kickoff prompt' }
      }

      return { ok: true }
    })

    const running = await startEducationTask(requestGateway as EducationGatewayRequest, task, NOW)

    expect(requestGateway.mock.calls.map(([method]) => method)).toEqual([
      'session.create',
      'file.attach',
      'slash.exec',
      'prompt.submit'
    ])
    expect(requestGateway).toHaveBeenCalledWith(
      'prompt.submit',
      expect.objectContaining({
        session_id: 'runtime-1',
        text: expect.stringContaining('@file:.hermes/desktop-attachments/lesson.pdf')
      }),
      PROMPT_SUBMIT_REQUEST_TIMEOUT_MS
    )
    expect(running.inputAttachments?.[0]).toMatchObject({
      attachedSessionId: 'runtime-1',
      refText: '@file:.hermes/desktop-attachments/lesson.pdf'
    })
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

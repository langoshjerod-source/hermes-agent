import { describe, expect, it } from 'vitest'

import type { SceneExecutionSnapshot } from './scene'
import { createDraftTask, taskHasRequiredArtifacts, transitionTask } from './task'

const NOW = '2026-07-29T00:00:00Z'
const LATER = '2026-07-29T01:00:00Z'

const sceneSnapshot: SceneExecutionSnapshot = {
  capturedAt: NOW,
  scene: {
    id: 'scene:textbook-course-tree',
    name: '教材课程树',
    version: 1,
    intake: [],
    sourceRequirements: [],
    outputContracts: [
      { id: 'course-tree-xlsx', label: '教材课程树 Excel', mediaType: 'application/vnd.ms-excel', required: true },
      { id: 'lower-note', label: '下册说明', mediaType: 'text/plain', required: false }
    ]
  },
  role: {
    id: 'role:textbook-structure',
    name: '教材结构助手',
    version: 1,
    profileSeed: 'default',
    soul: '确认范围后执行',
    modelPolicy: { kind: 'profile-default' },
    capabilityIds: []
  }
}

describe('education task state', () => {
  it('moves through the normal ready, queued and running path', () => {
    const draft = createDraftTask({ id: 'task:1', title: '教材课程树', createdAt: NOW })
    const ready = transitionTask(draft, 'ready', LATER, { sceneSnapshot })
    const queued = transitionTask(ready, 'queued', LATER)
    const running = transitionTask(queued, 'running', LATER)

    expect(running.state).toBe('running')
    expect(running.sceneSnapshot?.scene.id).toBe('scene:textbook-course-tree')
  })

  it('rejects invalid and terminal-state transitions', () => {
    const draft = createDraftTask({ id: 'task:1', title: '教材课程树', createdAt: NOW })

    expect(() => transitionTask(draft, 'completed', LATER)).toThrow(/draft -> completed/)

    const cancelled = transitionTask(draft, 'cancelled', LATER)
    expect(() => transitionTask(cancelled, 'queued', LATER)).toThrow(/cancelled -> queued/)
  })

  it('requires a concrete question before waiting for user input', () => {
    const draft = createDraftTask({ id: 'task:1', title: '教材课程树', createdAt: NOW })
    const ready = transitionTask(draft, 'ready', LATER, { sceneSnapshot })
    const running = transitionTask(transitionTask(ready, 'queued', LATER), 'running', LATER)

    expect(() => transitionTask(running, 'waiting_input', LATER)).toThrow(/requires a waiting question/)
  })

  it('preserves ambiguity candidates and clears the question when execution resumes', () => {
    const draft = createDraftTask({ id: 'task:1', title: '教材课程树', createdAt: NOW })
    const ready = transitionTask(draft, 'ready', LATER, { sceneSnapshot })
    const running = transitionTask(transitionTask(ready, 'queued', LATER), 'running', LATER)

    const waiting = transitionTask(running, 'waiting_input', LATER, {
      waitingQuestion: {
        fieldId: 'edition',
        prompt: '请选择教材版本',
        candidates: [
          { label: '沪教版', value: 'hj', sourceId: 'xueke', details: { year: '2025' } },
          { label: '沪教版（五四制）', value: 'hj-54', sourceId: 'xueke', details: { system: '五四制' } }
        ]
      }
    })

    expect(waiting.waitingQuestion?.candidates).toHaveLength(2)
    expect(transitionTask(waiting, 'running', LATER).waitingQuestion).toBeNull()
  })

  it('represents a missing lower volume as a scoped absence in a partial result', () => {
    const draft = createDraftTask({ id: 'task:1', title: '教材课程树', createdAt: NOW })
    const ready = transitionTask(draft, 'ready', LATER, { sceneSnapshot })
    const running = transitionTask(transitionTask(ready, 'queued', LATER), 'running', LATER)

    const partial = transitionTask(running, 'partial', LATER, {
      scopeAbsences: [{ code: 'not_provided_by_source', label: '下册', sourceId: 'xueke' }]
    })

    expect(partial.failureCode).toBeNull()
    expect(partial.scopeAbsences).toEqual([{ code: 'not_provided_by_source', label: '下册', sourceId: 'xueke' }])
  })

  it('requires every required artifact contract before completion can be claimed', () => {
    const draft = createDraftTask({ id: 'task:1', title: '教材课程树', createdAt: NOW })
    const withScene = { ...draft, sceneSnapshot }

    expect(taskHasRequiredArtifacts(withScene)).toBe(false)
    expect(
      taskHasRequiredArtifacts({
        ...withScene,
        artifacts: [
          {
            id: 'course-tree-xlsx',
            label: '教材课程树.xlsx',
            mediaType: 'application/vnd.ms-excel',
            required: true,
            value: '/tmp/教材课程树.xlsx'
          }
        ]
      })
    ).toBe(true)
  })
})

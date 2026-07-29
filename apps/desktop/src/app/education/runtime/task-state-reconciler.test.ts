import { describe, expect, it } from 'vitest'

import { createClientSessionState } from '@/lib/chat-runtime'

import { type EducationTask, transitionTask } from '../domain/task'

import { reconcileEducationTasks, reconcileEducationTaskState } from './task-state-reconciler'

const NOW = '2026-07-29T06:00:00Z'

function runningTask(): EducationTask {
  return {
    id: 'task:1',
    title: '教材课程树',
    state: 'running',
    sceneSnapshot: null,
    inputs: {},
    sourceBindings: [],
    hermes: {
      connectionScope: 'remote:https://gateway.example',
      profile: 'mxb001',
      runtimeSessionId: 'runtime-1',
      storedSessionId: 'stored-1'
    },
    waitingQuestion: null,
    artifacts: [],
    scopeAbsences: [],
    failureCode: null,
    createdAt: NOW,
    updatedAt: NOW
  }
}

describe('education task state reconciler', () => {
  it('marks a running task as waiting when its Hermes session needs input', () => {
    const state = { ...createClientSessionState('stored-1'), busy: true, needsInput: true }

    const task = reconcileEducationTaskState(runningTask(), { 'runtime-1': state }, NOW, {
      'runtime-1': {
        requestId: 'clarify-1',
        question: '请选择真实教材版本',
        choices: ['沪教版', '沪教版（五四制）']
      }
    })

    expect(task.state).toBe('waiting_input')
    expect(task.waitingQuestion?.fieldId).toBe('hermes-session')
    expect(task.waitingQuestion?.prompt).toBe('请选择真实教材版本')
    expect(task.waitingQuestion?.candidates.map(candidate => candidate.value)).toEqual(['沪教版', '沪教版（五四制）'])
  })

  it('returns a waiting task to running after the user answers', () => {
    const waiting = transitionTask(runningTask(), 'waiting_input', NOW, {
      waitingQuestion: { fieldId: 'edition', prompt: '选择教材版本', candidates: [] }
    })

    const state = { ...createClientSessionState('stored-1'), busy: true, needsInput: false }

    expect(reconcileEducationTaskState(waiting, { 'runtime-1': state }, NOW).state).toBe('running')
  })

  it('preserves array identity when no task changes', () => {
    const tasks = [runningTask()]

    expect(reconcileEducationTasks(tasks, {}, NOW)).toBe(tasks)
  })
})

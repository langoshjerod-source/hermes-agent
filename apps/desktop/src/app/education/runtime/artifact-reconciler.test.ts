import { describe, expect, it } from 'vitest'

import { collectArtifactCandidates } from '@/app/artifacts/artifact-utils'
import type { SessionMessage } from '@/types/hermes'

import { transitionTask } from '../domain/task'
import { prepareEducationTask } from '../domain/task-preparation'
import { BUILTIN_EDUCATION_SCENES } from '../scenarios/builtin-scenes'
import { BUILTIN_EDUCATION_ROLES } from '../templates/builtin-roles'

import { finishEducationTask } from './artifact-reconciler'

const NOW = '2026-07-29T07:00:00Z'

function runningTask() {
  const ready = prepareEducationTask({
    id: 'task:1',
    purpose: '生成审核工作簿',
    scene: BUILTIN_EDUCATION_SCENES[0],
    role: BUILTIN_EDUCATION_ROLES[0],
    values: {
      edition: '沪教版',
      grade: '五年级',
      source: 'source:xueke',
      stage: '小学',
      subject: '数学',
      volumes: ['upper']
    },
    createdAt: NOW,
    hermes: { connectionScope: 'local', profile: 'default' }
  })

  return transitionTask(transitionTask(ready, 'queued', NOW), 'running', NOW)
}

describe('education artifact reconciler', () => {
  it('recognizes an xlsx path as the required course-tree deliverable', () => {
    const messages: SessionMessage[] = [
      { role: 'assistant', content: '已生成：/tmp/学科网_五年级数学_教材课程树.xlsx', timestamp: 1 }
    ]

    const candidates = collectArtifactCandidates(messages)
    const task = finishEducationTask(runningTask(), candidates, NOW)

    expect(candidates[0]).toMatchObject({ kind: 'file', label: '学科网_五年级数学_教材课程树.xlsx' })
    expect(task.state).toBe('completed')
    expect(task.artifacts[0]).toMatchObject({
      id: 'textbook-course-tree-xlsx',
      value: '/tmp/学科网_五年级数学_教材课程树.xlsx'
    })
  })

  it('marks a goal result partial when the required workbook is absent', () => {
    expect(finishEducationTask(runningTask(), [], NOW).state).toBe('partial')
  })
})

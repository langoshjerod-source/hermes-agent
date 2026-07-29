import { describe, expect, it } from 'vitest'

import { BUILTIN_EDUCATION_SCENES } from '../scenarios/builtin-scenes'
import { BUILTIN_EDUCATION_ROLES } from '../templates/builtin-roles'

import { missingRequiredIntake, prepareEducationTask } from './task-preparation'

const NOW = '2026-07-29T04:00:00Z'
const scene = BUILTIN_EDUCATION_SCENES[0]
const role = BUILTIN_EDUCATION_ROLES[0]

const values = {
  edition: '沪教版',
  grade: '五年级',
  source: 'source:xueke',
  stage: '小学',
  subject: '数学',
  volumes: ['upper', 'lower']
}

describe('education task preparation', () => {
  it('reports required fields before task creation', () => {
    expect(missingRequiredIntake(scene, { stage: '小学', volumes: [] })).toEqual([
      'subject',
      'grade',
      'edition',
      'volumes',
      'source'
    ])
  })

  it('creates a ready task with immutable scene and role snapshots', () => {
    const task = prepareEducationTask({
      id: 'task:1',
      purpose: '整理供老师核对并导入的目录树',
      scene,
      role,
      values,
      createdAt: NOW,
      hermes: { connectionScope: 'remote:https://gateway.example', profile: 'mxb001' }
    })

    expect(task.state).toBe('ready')
    expect(task.inputs).toMatchObject({ ...values, purpose: '整理供老师核对并导入的目录树' })
    expect(task.sourceBindings).toEqual(['source:xueke'])
    expect(task.sceneSnapshot?.scene.id).toBe(scene.id)
    expect(task.sceneSnapshot?.role.id).toBe(role.id)
  })

  it('requires a clear purpose before creating a task', () => {
    expect(() =>
      prepareEducationTask({
        id: 'task:1',
        purpose: '  ',
        scene,
        role,
        values,
        createdAt: NOW,
        hermes: { connectionScope: 'local', profile: 'default' }
      })
    ).toThrow(/purpose is required/)
  })
})

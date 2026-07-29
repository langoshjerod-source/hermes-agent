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
    expect(missingRequiredIntake(scene, { stage: '小学', volumes: [] })).toEqual(['subject', 'grade'])
  })

  it('does not block creation on convenience fields and defaults to both volumes', () => {
    const task = prepareEducationTask({
      id: 'task:optional',
      purpose: '',
      scene,
      role,
      values: { stage: '小学', subject: '数学', grade: '五年级' },
      createdAt: NOW,
      hermes: { connectionScope: 'local', profile: 'default' }
    })

    expect(task.inputs).toMatchObject({ volumes: ['upper', 'lower'] })
    expect(task.sourceBindings).toEqual([])
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
    expect(task.inputs).toMatchObject({
      ...values,
      purpose: '按场景卡已确认的结构化范围完成“教材课程树”，并交付：教材课程树 Excel'
    })
    expect(task.sourceBindings).toEqual(['source:xueke'])
    expect(task.sceneSnapshot?.scene.id).toBe(scene.id)
    expect(task.sceneSnapshot?.role.id).toBe(role.id)
  })

  it('uses the confirmed structured scene scope instead of conflicting free text', () => {
    const task = prepareEducationTask({
      id: 'task:1',
      purpose: '这里误写了二年级',
      scene,
      role,
      values,
      createdAt: NOW,
      hermes: { connectionScope: 'local', profile: 'default' }
    })

    expect(task.inputs.purpose).not.toContain('二年级')
    expect(task.inputs.grade).toBe('五年级')
  })

  it('copies input attachments into the ready task', () => {
    const inputAttachments = [
      { id: 'file:/tmp/notes.pdf', kind: 'file' as const, label: 'notes.pdf', path: '/tmp/notes.pdf' }
    ]

    const task = prepareEducationTask({
      id: 'task:attachment',
      purpose: '',
      scene,
      role,
      values,
      inputAttachments,
      createdAt: NOW,
      hermes: { connectionScope: 'local', profile: 'default' }
    })

    expect(task.inputAttachments).toEqual(inputAttachments)
    expect(task.inputAttachments).not.toBe(inputAttachments)
  })
})

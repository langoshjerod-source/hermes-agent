import { describe, expect, it } from 'vitest'

import { builtinEducationRole } from '../templates/builtin-roles'

import { BUILTIN_EDUCATION_SCENES, builtinEducationScene } from './builtin-scenes'

describe('built-in education scenes', () => {
  it('ships the built-in scenarios with national resource discovery separate from course trees', () => {
    expect(BUILTIN_EDUCATION_SCENES.map(scene => scene.id)).toEqual([
      'scene:textbook-course-tree',
      'scene:subject-knowledge-tree',
      'scene:national-smartedu-resource-discovery',
      'scene:document-organization'
    ])
  })

  it('binds every scene to an existing built-in role', () => {
    for (const scene of BUILTIN_EDUCATION_SCENES) {
      expect(builtinEducationRole(scene.roleTemplateId), scene.id).not.toBeNull()
    }
  })

  it('requires grade, edition and volume only for the textbook course tree', () => {
    const course = builtinEducationScene('scene:textbook-course-tree')!
    const knowledge = builtinEducationScene('scene:subject-knowledge-tree')!

    expect(course.intake.map(field => field.id)).toEqual(['stage', 'subject', 'grade', 'edition', 'volumes', 'source'])
    expect(knowledge.intake.map(field => field.id)).toEqual(['stage', 'subject', 'source'])
  })

  it('offers official catalogue sources only where their capability is supported', () => {
    const course = builtinEducationScene('scene:textbook-course-tree')!
    const knowledge = builtinEducationScene('scene:subject-knowledge-tree')!
    const courseSources = course.intake.find(field => field.id === 'source')?.options?.map(option => option.value)
    const knowledgeSources = knowledge.intake.find(field => field.id === 'source')?.options?.map(option => option.value)

    expect(courseSources).toContain('source:air-classroom')
    expect(courseSources).not.toContain('source:national-smartedu')
    expect(knowledgeSources).not.toContain('source:air-classroom')
    expect(knowledgeSources).not.toContain('source:national-smartedu')
  })

  it('requires a clear purpose before document organization can run', () => {
    const document = builtinEducationScene('scene:document-organization')!

    expect(document.purposeMode).toBe('required')
    expect(document.intake.find(field => field.id === 'purpose')).toBeUndefined()
    expect(document.intake.find(field => field.id === 'files')).toMatchObject({ kind: 'file-list', required: true })
  })

  it('binds national platform discovery to its dedicated source and output contract', () => {
    const national = builtinEducationScene('scene:national-smartedu-resource-discovery')!

    expect(national.purposeMode).toBe('structured')
    expect(national.intake.find(field => field.id === 'source')?.options).toEqual([
      { label: '国家智慧教育平台', value: 'source:national-smartedu' }
    ])
    expect(national.outputContracts[0].id).toBe('national-smartedu-resource-catalog-xlsx')
  })
})

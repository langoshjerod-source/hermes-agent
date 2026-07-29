import { describe, expect, it } from 'vitest'

import { builtinEducationRole } from '../templates/builtin-roles'

import { BUILTIN_EDUCATION_SCENES, builtinEducationScene } from './builtin-scenes'

describe('built-in education scenes', () => {
  it('ships exactly the three first-release scenarios', () => {
    expect(BUILTIN_EDUCATION_SCENES.map(scene => scene.id)).toEqual([
      'scene:textbook-course-tree',
      'scene:subject-knowledge-tree',
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

  it('requires a clear purpose before document organization can run', () => {
    const document = builtinEducationScene('scene:document-organization')!

    expect(document.intake.find(field => field.id === 'purpose')).toMatchObject({ kind: 'text', required: true })
    expect(document.intake.find(field => field.id === 'files')).toMatchObject({ kind: 'file-list', required: true })
  })
})

import { describe, expect, it } from 'vitest'

import {
  educationSourceDefinition,
  missingEducationSourceSkills,
  resolveEducationSourceAvailability
} from './catalog'

describe('education source catalog', () => {
  it('marks a Skill-backed source unavailable when the current Hermes profile does not have the Skill enabled', () => {
    const source = educationSourceDefinition('source:air-classroom')!

    expect(resolveEducationSourceAvailability(source, [])).toMatchObject({ state: 'not_configured' })
    expect(
      resolveEducationSourceAvailability(source, [{ enabled: true, name: 'shanghai-smartedu-catalog' }])
    ).toMatchObject({ state: 'available' })
  })

  it('fails closed for disabled or missing source Skills', () => {
    expect(
      missingEducationSourceSkills(
        ['source:xueke', 'source:air-classroom'],
        [
          { enabled: true, name: 'xueke-textbook-knowledge-tree' },
          { enabled: false, name: 'shanghai-smartedu-catalog' }
        ]
      )
    ).toEqual(['shanghai-smartedu-catalog'])
  })

  it('binds the national platform to a dedicated resource-discovery Skill', () => {
    const source = educationSourceDefinition('source:national-smartedu')!

    expect(source.capabilities).not.toContain('catalogue')
    expect(source.execution.preferredSkillId).toBe('national-smartedu-resource-catalog')
    expect(resolveEducationSourceAvailability(source, [])).toMatchObject({ state: 'not_configured' })
    expect(missingEducationSourceSkills([source.id], [])).toEqual(['national-smartedu-resource-catalog'])
  })
})

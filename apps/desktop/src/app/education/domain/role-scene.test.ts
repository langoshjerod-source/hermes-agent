import { describe, expect, it } from 'vitest'

import { cloneRoleTemplate, type RoleTemplate, updatePersonalRole } from './role'
import { cloneScenePackage, type ScenePackage, snapshotSceneExecution, updatePersonalScene } from './scene'
import { hasOriginUpdate } from './template'

const NOW = '2026-07-29T00:00:00Z'
const LATER = '2026-07-29T01:00:00Z'

const builtinRole: RoleTemplate = {
  id: 'role:textbook-structure',
  name: '教材结构助手',
  description: '整理真实教材目录结构',
  ownership: 'builtin',
  version: 2,
  profileSeed: 'default',
  soul: '先确认教材范围，再整理结构。',
  modelPolicy: { kind: 'profile-default' },
  capabilityIds: ['source.catalogue', 'artifact.xlsx'],
  createdAt: NOW,
  updatedAt: NOW
}

const builtinScene: ScenePackage = {
  id: 'scene:textbook-course-tree',
  name: '教材课程树',
  description: '生成单元—课程树',
  ownership: 'builtin',
  version: 3,
  roleTemplateId: builtinRole.id,
  intake: [
    {
      id: 'edition',
      kind: 'select',
      label: '教材版本',
      required: true,
      options: [{ label: '沪教版', value: 'hj' }]
    }
  ],
  sourceRequirements: [{ capability: 'catalogue', acceptedKinds: ['xueke'], required: true }],
  outputContracts: [
    { id: 'course-tree-xlsx', label: '教材课程树 Excel', mediaType: 'application/vnd.ms-excel', required: true }
  ],
  createdAt: NOW,
  updatedAt: NOW
}

describe('education role templates', () => {
  it('requires copying before a built-in role can be edited', () => {
    expect(() => updatePersonalRole(builtinRole, { name: '被覆盖' }, LATER)).toThrow(/immutable/)
  })

  it('copies a built-in role into an independent personal version', () => {
    const copy = cloneRoleTemplate(builtinRole, { id: 'role:mine', now: LATER })
    const edited = updatePersonalRole(copy, { capabilityIds: ['artifact.xlsx'], name: '我的教材助手' }, LATER)

    expect(copy).toMatchObject({
      id: 'role:mine',
      ownership: 'personal',
      version: 1,
      clonedFrom: { id: builtinRole.id, version: 2 }
    })
    expect(edited).toMatchObject({ name: '我的教材助手', version: 2 })
    expect(edited.capabilityIds).toEqual(['artifact.xlsx'])
    expect(builtinRole.capabilityIds).toEqual(['source.catalogue', 'artifact.xlsx'])
  })

  it('detects a newer built-in without overwriting the personal copy', () => {
    const copy = cloneRoleTemplate(builtinRole, { id: 'role:mine', now: LATER })

    expect(hasOriginUpdate(copy, 3)).toBe(true)
    expect(hasOriginUpdate(copy, 2)).toBe(false)
  })
})

describe('education scene packages', () => {
  it('requires copying before a built-in scene can be edited', () => {
    expect(() => updatePersonalScene(builtinScene, { name: '被覆盖' }, LATER)).toThrow(/immutable/)
  })

  it('copies nested scene fields without sharing mutable arrays', () => {
    const copy = cloneScenePackage(builtinScene, { id: 'scene:mine', now: LATER })

    copy.intake[0].options?.push({ label: '沪教版（五四制）', value: 'hj-54' })
    copy.sourceRequirements[0].acceptedKinds.push('private_textbook')

    expect(builtinScene.intake[0].options).toHaveLength(1)
    expect(builtinScene.sourceRequirements[0].acceptedKinds).toEqual(['xueke'])
  })

  it('snapshots scene and role configuration for historical tasks', () => {
    const snapshot = snapshotSceneExecution(builtinScene, builtinRole, LATER)

    builtinScene.intake[0].label = '已修改字段'
    builtinRole.capabilityIds.push('source.read')

    expect(snapshot.scene.intake[0].label).toBe('教材版本')
    expect(snapshot.role.capabilityIds).toEqual(['source.catalogue', 'artifact.xlsx'])
    expect(snapshot).toMatchObject({
      capturedAt: LATER,
      scene: { id: builtinScene.id, version: 3 },
      role: { id: builtinRole.id, version: 2 }
    })
  })

  it('rejects a role that is not bound to the scene', () => {
    expect(() => snapshotSceneExecution(builtinScene, { ...builtinRole, id: 'role:other' }, LATER)).toThrow(
      /requires role/
    )
  })
})

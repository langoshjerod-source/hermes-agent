import { assertPersonalTemplate, nextTemplateVersion, type TemplateOrigin, type VersionedTemplate } from './template'

export interface RoleModelPolicy {
  kind: 'profile-default' | 'specific'
  model?: string
  provider?: string
}

export interface RoleTemplate extends VersionedTemplate {
  description: string
  profileSeed: string | null
  soul: string
  modelPolicy: RoleModelPolicy
  capabilityIds: string[]
}

export interface CloneRoleInput {
  id: string
  name?: string
  now: string
}

export interface RoleUpdate {
  capabilityIds?: string[]
  description?: string
  modelPolicy?: RoleModelPolicy
  name?: string
  profileSeed?: string | null
  soul?: string
}

function roleOrigin(role: RoleTemplate): TemplateOrigin {
  return role.ownership === 'builtin'
    ? { id: role.id, version: role.version }
    : (role.clonedFrom ?? {
        id: role.id,
        version: role.version
      })
}

export function cloneRoleTemplate(role: RoleTemplate, input: CloneRoleInput): RoleTemplate {
  return {
    ...role,
    id: input.id,
    name: input.name?.trim() || `${role.name}副本`,
    ownership: 'personal',
    version: 1,
    clonedFrom: roleOrigin(role),
    capabilityIds: [...role.capabilityIds],
    modelPolicy: { ...role.modelPolicy },
    createdAt: input.now,
    updatedAt: input.now
  }
}

export function updatePersonalRole(role: RoleTemplate, update: RoleUpdate, now: string): RoleTemplate {
  assertPersonalTemplate(role)

  return {
    ...role,
    ...update,
    capabilityIds: update.capabilityIds ? [...update.capabilityIds] : [...role.capabilityIds],
    modelPolicy: update.modelPolicy ? { ...update.modelPolicy } : { ...role.modelPolicy },
    name: update.name?.trim() || role.name,
    version: nextTemplateVersion(role),
    updatedAt: now
  }
}

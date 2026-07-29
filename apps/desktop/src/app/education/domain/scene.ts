import type { RoleTemplate } from './role'
import { assertPersonalTemplate, nextTemplateVersion, type TemplateOrigin, type VersionedTemplate } from './template'

export type IntakeFieldKind = 'file-list' | 'multi-select' | 'select' | 'source-select' | 'text'

export interface IntakeOption {
  label: string
  value: string
}

export interface IntakeField {
  id: string
  kind: IntakeFieldKind
  label: string
  description?: string
  required: boolean
  options?: IntakeOption[]
}

export interface SceneSourceRequirement {
  capability: 'catalogue' | 'read' | 'refresh' | 'search'
  acceptedKinds: string[]
  required: boolean
}

export interface SceneOutputContract {
  id: string
  label: string
  mediaType: string
  required: boolean
}

export interface ScenePackage extends VersionedTemplate {
  description: string
  purposeMode?: 'required' | 'structured'
  roleTemplateId: string
  intake: IntakeField[]
  sourceRequirements: SceneSourceRequirement[]
  outputContracts: SceneOutputContract[]
}

export interface CloneSceneInput {
  id: string
  name?: string
  now: string
}

export interface SceneUpdate {
  description?: string
  intake?: IntakeField[]
  name?: string
  outputContracts?: SceneOutputContract[]
  purposeMode?: 'required' | 'structured'
  roleTemplateId?: string
  sourceRequirements?: SceneSourceRequirement[]
}

export interface RoleExecutionSnapshot {
  id: string
  name: string
  version: number
  profileSeed: string | null
  soul: string
  modelPolicy: RoleTemplate['modelPolicy']
  capabilityIds: string[]
}

export interface SceneExecutionSnapshot {
  capturedAt: string
  scene: {
    id: string
    name: string
    version: number
    purposeMode?: 'required' | 'structured'
    intake: IntakeField[]
    sourceRequirements: SceneSourceRequirement[]
    outputContracts: SceneOutputContract[]
  }
  role: RoleExecutionSnapshot
}

function cloneIntake(fields: IntakeField[]): IntakeField[] {
  return fields.map(field => ({
    ...field,
    options: field.options?.map(option => ({ ...option }))
  }))
}

function cloneSourceRequirements(requirements: SceneSourceRequirement[]): SceneSourceRequirement[] {
  return requirements.map(requirement => ({ ...requirement, acceptedKinds: [...requirement.acceptedKinds] }))
}

function cloneOutputContracts(contracts: SceneOutputContract[]): SceneOutputContract[] {
  return contracts.map(contract => ({ ...contract }))
}

function sceneOrigin(scene: ScenePackage): TemplateOrigin {
  return scene.ownership === 'builtin'
    ? { id: scene.id, version: scene.version }
    : (scene.clonedFrom ?? {
        id: scene.id,
        version: scene.version
      })
}

export function cloneScenePackage(scene: ScenePackage, input: CloneSceneInput): ScenePackage {
  return {
    ...scene,
    id: input.id,
    name: input.name?.trim() || `${scene.name}副本`,
    ownership: 'personal',
    version: 1,
    clonedFrom: sceneOrigin(scene),
    intake: cloneIntake(scene.intake),
    sourceRequirements: cloneSourceRequirements(scene.sourceRequirements),
    outputContracts: cloneOutputContracts(scene.outputContracts),
    createdAt: input.now,
    updatedAt: input.now
  }
}

export function updatePersonalScene(scene: ScenePackage, update: SceneUpdate, now: string): ScenePackage {
  assertPersonalTemplate(scene)

  return {
    ...scene,
    ...update,
    intake: cloneIntake(update.intake ?? scene.intake),
    sourceRequirements: cloneSourceRequirements(update.sourceRequirements ?? scene.sourceRequirements),
    outputContracts: cloneOutputContracts(update.outputContracts ?? scene.outputContracts),
    name: update.name?.trim() || scene.name,
    version: nextTemplateVersion(scene),
    updatedAt: now
  }
}

export function snapshotSceneExecution(
  scene: ScenePackage,
  role: RoleTemplate,
  capturedAt: string
): SceneExecutionSnapshot {
  if (scene.roleTemplateId !== role.id) {
    throw new Error(`Scene ${scene.id} requires role ${scene.roleTemplateId}, received ${role.id}`)
  }

  return {
    capturedAt,
    scene: {
      id: scene.id,
      name: scene.name,
      version: scene.version,
      purposeMode: scene.purposeMode,
      intake: cloneIntake(scene.intake),
      sourceRequirements: cloneSourceRequirements(scene.sourceRequirements),
      outputContracts: cloneOutputContracts(scene.outputContracts)
    },
    role: {
      id: role.id,
      name: role.name,
      version: role.version,
      profileSeed: role.profileSeed,
      soul: role.soul,
      modelPolicy: { ...role.modelPolicy },
      capabilityIds: [...role.capabilityIds]
    }
  }
}

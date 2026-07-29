import type { RoleTemplate } from './role'
import { type ScenePackage, snapshotSceneExecution } from './scene'
import {
  createDraftTask,
  type EducationTask,
  type TaskHermesIdentity,
  type TaskInputAttachment,
  transitionTask
} from './task'

export interface PrepareEducationTaskInput {
  createdAt: string
  hermes: Pick<TaskHermesIdentity, 'connectionScope' | 'profile'>
  id: string
  inputAttachments?: TaskInputAttachment[]
  purpose: string
  role: RoleTemplate
  scene: ScenePackage
  values: Record<string, unknown>
}

export function missingRequiredIntake(
  scene: ScenePackage,
  values: Record<string, unknown>,
  inputAttachments: TaskInputAttachment[] = []
): string[] {
  return scene.intake
    .filter(field => field.required)
    .filter(field => {
      if (field.kind === 'file-list') {
        return inputAttachments.length === 0
      }

      const value = values[field.id]

      return Array.isArray(value) ? value.length === 0 : typeof value !== 'string' || value.trim() === ''
    })
    .map(field => field.id)
}

export function prepareEducationTask(input: PrepareEducationTaskInput): EducationTask {
  const purpose =
    input.scene.purposeMode === 'structured'
      ? `按场景卡已确认的结构化范围完成“${input.scene.name}”，并交付：${input.scene.outputContracts
          .map(output => output.label)
          .join('、')}`
      : input.purpose.trim()

  if (!purpose) {
    throw new Error('Education task purpose is required')
  }

  const missing = missingRequiredIntake(input.scene, input.values, input.inputAttachments)

  if (missing.length) {
    throw new Error(`Education task intake is incomplete: ${missing.join(', ')}`)
  }

  const values = { ...input.values }
  const volumeField = input.scene.intake.find(field => field.id === 'volumes' && field.kind === 'multi-select')

  if ((!Array.isArray(values.volumes) || values.volumes.length === 0) && volumeField?.options?.length) {
    values.volumes = volumeField.options.map(option => option.value)
  }

  const sourceField = input.scene.intake.find(field => field.id === 'source' && field.kind === 'source-select')

  if ((!values.source || typeof values.source !== 'string') && sourceField?.options?.length === 1) {
    values.source = sourceField.options[0]?.value
  }

  const source = values.source
  const title = input.scene.id === 'scene:general-research-task' ? purpose.slice(0, 60) : input.scene.name
  const draft = createDraftTask({ id: input.id, title, createdAt: input.createdAt })

  return transitionTask(draft, 'ready', input.createdAt, {
    sceneSnapshot: snapshotSceneExecution(input.scene, input.role, input.createdAt),
    inputs: { ...values, purpose },
    inputAttachments: input.inputAttachments?.map(attachment => ({ ...attachment })) ?? [],
    sourceBindings: typeof source === 'string' && source.trim() ? [source] : [],
    hermes: {
      connectionScope: input.hermes.connectionScope,
      profile: input.hermes.profile
    }
  })
}

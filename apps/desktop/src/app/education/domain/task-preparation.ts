import type { RoleTemplate } from './role'
import { type ScenePackage, snapshotSceneExecution } from './scene'
import { createDraftTask, type EducationTask, type TaskHermesIdentity, transitionTask } from './task'

export interface PrepareEducationTaskInput {
  createdAt: string
  hermes: Pick<TaskHermesIdentity, 'connectionScope' | 'profile'>
  id: string
  purpose: string
  role: RoleTemplate
  scene: ScenePackage
  values: Record<string, unknown>
}

export function missingRequiredIntake(scene: ScenePackage, values: Record<string, unknown>): string[] {
  return scene.intake
    .filter(field => field.required)
    .filter(field => {
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

  const missing = missingRequiredIntake(input.scene, input.values)

  if (missing.length) {
    throw new Error(`Education task intake is incomplete: ${missing.join(', ')}`)
  }

  const source = input.values.source
  const draft = createDraftTask({ id: input.id, title: input.scene.name, createdAt: input.createdAt })

  return transitionTask(draft, 'ready', input.createdAt, {
    sceneSnapshot: snapshotSceneExecution(input.scene, input.role, input.createdAt),
    inputs: { ...input.values, purpose },
    sourceBindings: typeof source === 'string' && source.trim() ? [source] : [],
    hermes: {
      connectionScope: input.hermes.connectionScope,
      profile: input.hermes.profile
    }
  })
}

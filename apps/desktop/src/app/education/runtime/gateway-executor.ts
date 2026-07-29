import { PROMPT_SUBMIT_REQUEST_TIMEOUT_MS } from '@/hermes'
import type { SessionCreateResponse } from '@/types/hermes'

import type { EducationTask } from '../domain/task'
import { transitionTask } from '../domain/task'
import { educationSourceDefinition, educationSourceGoalContext } from '../sources/catalog'

export type EducationGatewayRequest = <T>(
  method: string,
  params?: Record<string, unknown>,
  timeoutMs?: number
) => Promise<T>

interface GoalDispatchResponse {
  message?: string
  notice?: string
  type?: string
}

interface GoalStatusResponse {
  output?: string
}

export type EducationGoalStatus = 'active' | 'done' | 'missing' | 'paused' | 'unknown'

export function educationTaskGoal(task: EducationTask): string {
  const snapshot = task.sceneSnapshot

  if (!snapshot) {
    throw new Error('Education task has no scene execution snapshot')
  }

  const requiredOutputs = snapshot.scene.outputContracts
    .map(output => `- ${output.label}（${output.mediaType}）`)
    .join('\n')

  const inputs = Object.entries(task.inputs)
    .map(([key, value]) => {
      const rendered = Array.isArray(value) ? value.join('、') : String(value)

      if (key !== 'source') {
        return `- ${key}: ${rendered}`
      }

      const source = educationSourceDefinition(rendered)

      return `- ${key}: ${source ? `${source.id}（${source.kind}）` : rendered}`
    })
    .join('\n')

  return [
    `完成教研任务：${task.title}`,
    '',
    `场景：${snapshot.scene.name}`,
    `角色：${snapshot.role.name}`,
    `角色工作要求：${snapshot.role.soul}`,
    `场景卡确认状态：${
      snapshot.scene.purposeMode === 'structured' ? 'SCENE_INTAKE_CONFIRMED' : 'USER_PURPOSE_PROVIDED'
    }`,
    '',
    '已确认的任务信息：',
    inputs,
    '',
    '数据来源执行上下文：',
    educationSourceGoalContext(task.sourceBindings),
    '',
    '必须交付：',
    requiredOutputs,
    '',
    '执行约束：',
    '- 先使用场景要求的数据来源和能力。',
    '- SCENE_INTAKE_CONFIRMED 表示用户已在场景确认页确认结构化字段；这些字段是唯一范围依据，不从 purpose 或补充说明重新解析年级、学科、版本或册次。',
    '- Skill 若要求目的确认令牌，可在参数完全一致时内部取得并继续，不得让用户重复确认相同范围；真实版本候选或来源歧义仍必须询问。',
    '- Skill 安装目录是只读发布物，不得写入 probe、缓存、临时脚本或产物；所有文件写入工作区输出目录。',
    '- 教材版本或范围存在多个真实候选时，停止并请用户确认，不得自行猜测。',
    '- 教材课程树与学科知识点树是独立产物，不按名称推测二者映射。',
    '- 来源确实不提供下册时，作为正常范围缺失写入备注，不得伪造。',
    '- 最终返回可打开的产物路径或 URL，并简要说明范围、数量和缺失项。'
  ].join('\n')
}

export async function inspectEducationGoalStatus(
  requestGateway: EducationGatewayRequest,
  task: EducationTask
): Promise<EducationGoalStatus> {
  const sessionId = task.hermes?.runtimeSessionId

  if (!sessionId) {
    return 'unknown'
  }

  const response = await requestGateway<GoalStatusResponse>('slash.exec', {
    session_id: sessionId,
    command: 'goal status'
  })

  const output = response.output?.trim() ?? ''

  if (/^✓ Goal done\b/i.test(output)) {
    return 'done'
  }

  if (/^⊙ Goal \(active|^⏳ Goal \(/i.test(output)) {
    return 'active'
  }

  if (/^⏸ Goal \(paused/i.test(output)) {
    return 'paused'
  }

  if (/^No active goal\b/i.test(output)) {
    return 'missing'
  }

  return 'unknown'
}

export async function startEducationTask(
  requestGateway: EducationGatewayRequest,
  task: EducationTask,
  now: string,
  onSessionCreated?: (task: EducationTask) => void
): Promise<EducationTask> {
  if (task.state !== 'queued') {
    throw new Error(`Education task must be queued before execution, received ${task.state}`)
  }

  if (!task.hermes) {
    throw new Error('Education task has no Hermes connection identity')
  }

  const goal = educationTaskGoal(task)

  const created = await requestGateway<SessionCreateResponse>('session.create', {
    cols: 96,
    profile: task.hermes.profile,
    source: 'desktop'
  })

  const boundTask: EducationTask = {
    ...task,
    hermes: {
      ...task.hermes,
      runtimeSessionId: created.session_id,
      storedSessionId: created.stored_session_id,
      lineageRootId: created.stored_session_id
    }
  }

  onSessionCreated?.(boundTask)

  const dispatch = await requestGateway<GoalDispatchResponse>('slash.exec', {
    session_id: created.session_id,
    command: `goal ${goal}`
  })

  const kickoff = dispatch.message?.trim()

  if (dispatch.type !== 'send' || !kickoff) {
    throw new Error('Hermes goal command did not return a kickoff message')
  }

  await requestGateway(
    'prompt.submit',
    { session_id: created.session_id, text: kickoff },
    PROMPT_SUBMIT_REQUEST_TIMEOUT_MS
  )

  return transitionTask(boundTask, 'running', now)
}

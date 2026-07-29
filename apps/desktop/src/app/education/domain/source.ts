export type EducationSourceCapability = 'catalogue' | 'read' | 'refresh' | 'search'

export type EducationSourceKind = 'knowledge_base' | 'private_textbook' | 'url' | 'user_file' | 'web_search' | 'xueke'

export type EducationSourceState =
  | 'authentication_required'
  | 'available'
  | 'degraded'
  | 'not_configured'
  | 'unreachable'
  | 'unsupported_scope'

export interface EducationSource {
  id: string
  kind: EducationSourceKind
  capabilities: EducationSourceCapability[]
  state: EducationSourceState
  supportedScope: string
  technicalProvider?: string
  lastSuccessfulCheck?: string
}

export interface TeacherSourceView {
  id: string
  label: string
  capabilities: EducationSourceCapability[]
  state: EducationSourceState
  supportedScope: string
  lastSuccessfulCheck?: string
}

const TEACHER_SOURCE_LABELS: Record<EducationSourceKind, string> = {
  knowledge_base: '知识库',
  private_textbook: '已配置教材来源',
  url: '网页地址',
  user_file: '我的文件',
  web_search: '联网搜索',
  xueke: '学科网'
}

const HIDDEN_PROVIDER_NAMES = [/RAGFlow/i, /教研云/, /好未来/]

export function toTeacherSourceView(source: EducationSource): TeacherSourceView {
  const view: TeacherSourceView = {
    id: source.id,
    label: TEACHER_SOURCE_LABELS[source.kind],
    capabilities: [...source.capabilities],
    state: source.state,
    supportedScope: source.supportedScope,
    lastSuccessfulCheck: source.lastSuccessfulCheck
  }

  const serialized = JSON.stringify(view)

  if (HIDDEN_PROVIDER_NAMES.some(pattern => pattern.test(serialized))) {
    throw new Error(`Teacher source view leaked a hidden provider name for ${source.id}`)
  }

  return view
}

import type { IntakeOption } from '../domain/scene'
import type { EducationSource } from '../domain/source'

interface InstalledSkillLike {
  enabled: boolean
  name: string
}

export interface EducationSourceExecution {
  officialDomains: string[]
  preferredSkillId?: string
  instructions: string[]
}

export interface EducationSourceDefinition extends EducationSource {
  execution: EducationSourceExecution
}

export const EDUCATION_SOURCE_CATALOG: readonly EducationSourceDefinition[] = [
  {
    id: 'source:xueke',
    kind: 'xueke',
    capabilities: ['catalogue', 'read'],
    state: 'available',
    supportedScope: '教材课程树、学科知识点树、专项突破',
    execution: {
      officialDomains: ['zxxk.com', 'xkw.com'],
      preferredSkillId: 'xueke-textbook-knowledge-tree',
      instructions: [
        '优先加载并遵循 xueke-textbook-knowledge-tree Skill，不把其他教材来源的数据混入学科网产物。',
        'SCENE_INTAKE_CONFIRMED 时场景卡已确认目的与结构化范围，不重复询问；教材版本存在多个真实候选时必须提供候选并等待选择。'
      ]
    }
  },
  {
    id: 'source:air-classroom',
    kind: 'shanghai_smartedu',
    capabilities: ['catalogue', 'read', 'refresh'],
    state: 'available',
    supportedScope: '上海智慧教育“空中课堂”学段、年级、学期、学科与教材章节目录',
    execution: {
      officialDomains: ['sh.smartedu.cn', 'www.sh.smartedu.cn'],
      preferredSkillId: 'shanghai-smartedu-catalog',
      instructions: [
        '必须加载并遵循 shanghai-smartedu-catalog Skill；优先使用 indexPanel 与 point/tree 接口，不依赖页面 DOM 猜目录。',
        'SCENE_INTAKE_CONFIRMED 时以场景卡字段为唯一范围，不从补充说明覆盖年级、学科、版本或学期。',
        '第一步只整理教材目录明细；课程知识点体系或教研内容必须在用户明确确认第二步后生成。',
        '学期、学科或版本未明确时先解析真实候选并请用户确认，不默认替换。'
      ]
    }
  },
  {
    id: 'source:national-smartedu',
    kind: 'national_smartedu',
    capabilities: ['search', 'read'],
    state: 'available',
    supportedScope: '国家智慧教育公共服务平台公开课程、教材、专题与教学资源',
    execution: {
      officialDomains: ['smartedu.cn', 'www.smartedu.cn', 'basic.smartedu.cn', '*.ykt.cbern.com.cn'],
      preferredSkillId: 'national-smartedu-resource-catalog',
      instructions: [
        '必须加载并遵循 national-smartedu-resource-catalog Skill；使用官方标签树、web_search 与浏览器访问 smartedu.cn 官方域名及其官方跳转页面。',
        '先确认目标学段、年级、学科和资源类型；需要登录或存在多个平台分区时停止并请用户选择。',
        '本来源默认交付官方教材与课程资源导航清单，不冒充教材课程树或知识点树；只有页面或接口提供明确层级关系时才保留该层级。',
        '证据不足时交付部分结果与缺口，不按名称补齐。'
      ]
    }
  },
  {
    id: 'source:configured-textbook',
    kind: 'private_textbook',
    capabilities: ['catalogue', 'read'],
    state: 'available',
    supportedScope: '按当前环境中已配置的教材来源实际范围',
    execution: {
      officialDomains: [],
      instructions: ['先读取当前实例实际可用的教材 Skill 和范围，不把固定私有来源名称展示给老师。']
    }
  },
  {
    id: 'source:knowledge-base',
    kind: 'knowledge_base',
    capabilities: ['search', 'read'],
    state: 'available',
    supportedScope: '已收录教材与教研资料',
    technicalProvider: 'RAGFlow',
    execution: {
      officialDomains: [],
      instructions: ['只使用当前实例知识库中可追溯的资料；检索结果不完整时保留缺口。']
    }
  },
  {
    id: 'source:web-search',
    kind: 'web_search',
    capabilities: ['search', 'read'],
    state: 'available',
    supportedScope: '公开互联网资料',
    execution: {
      officialDomains: [],
      instructions: ['使用当前实例配置的 web_search；优先官方来源并保留来源 URL。']
    }
  },
  {
    id: 'source:user-files',
    kind: 'user_file',
    capabilities: ['read'],
    state: 'available',
    supportedScope: 'PDF、Word、图片等用户文件',
    execution: {
      officialDomains: [],
      instructions: ['读取用户明确提供的文件；图片和扫描页使用视觉模型，不把文件名当作正文证据。']
    }
  }
]

export const TEXTBOOK_CATALOGUE_SOURCE_OPTIONS: readonly IntakeOption[] = [
  { label: '学科网', value: 'source:xueke' },
  { label: '空中课堂', value: 'source:air-classroom' },
  { label: '已配置教材来源', value: 'source:configured-textbook' }
]

export const NATIONAL_SMARTEDU_SOURCE_OPTIONS: readonly IntakeOption[] = [
  { label: '国家智慧教育平台', value: 'source:national-smartedu' }
]

export const SUBJECT_KNOWLEDGE_SOURCE_OPTIONS: readonly IntakeOption[] = [
  { label: '学科网', value: 'source:xueke' },
  { label: '已配置教材来源', value: 'source:configured-textbook' }
]

export function educationSourceDefinition(sourceId: string): EducationSourceDefinition | null {
  return EDUCATION_SOURCE_CATALOG.find(source => source.id === sourceId) ?? null
}

export function resolveEducationSourceAvailability(
  source: EducationSourceDefinition,
  installedSkills: readonly InstalledSkillLike[]
): EducationSourceDefinition {
  const requiredSkill = source.execution.preferredSkillId

  if (!requiredSkill) {
    return source
  }

  const available = installedSkills.some(skill => skill.name === requiredSkill && skill.enabled)

  return { ...source, state: available ? 'available' : 'not_configured' }
}

export function missingEducationSourceSkills(
  sourceIds: readonly string[],
  installedSkills: readonly InstalledSkillLike[]
): string[] {
  return sourceIds.flatMap(sourceId => {
    const requiredSkill = educationSourceDefinition(sourceId)?.execution.preferredSkillId

    if (!requiredSkill) {
      return []
    }

    return installedSkills.some(skill => skill.name === requiredSkill && skill.enabled) ? [] : [requiredSkill]
  })
}

export function educationSourceGoalContext(sourceIds: readonly string[]): string {
  if (!sourceIds.length) {
    return '- 未绑定数据来源；执行前必须请用户选择来源。'
  }

  return sourceIds
    .map(sourceId => {
      const source = educationSourceDefinition(sourceId)

      if (!source) {
        return [`- 未识别的数据来源：${sourceId}`, '  - 停止执行并请用户重新选择，不自行替换来源。'].join('\n')
      }

      const lines = [`- ${sourceId}（${source.kind}）`]

      if (source.execution.preferredSkillId) {
        lines.push(`  - 指定 Skill：${source.execution.preferredSkillId}`)
      }

      if (source.execution.officialDomains.length) {
        lines.push(`  - 官方域名：${source.execution.officialDomains.join('、')}`)
      }

      lines.push(...source.execution.instructions.map(instruction => `  - ${instruction}`))

      return lines.join('\n')
    })
    .join('\n')
}

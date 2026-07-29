import type { ScenePackage } from '../domain/scene'
import {
  NATIONAL_SMARTEDU_SOURCE_OPTIONS,
  SUBJECT_KNOWLEDGE_SOURCE_OPTIONS,
  TEXTBOOK_CATALOGUE_SOURCE_OPTIONS
} from '../sources/catalog'

const BUILTIN_CREATED_AT = '2026-07-29T00:00:00Z'

const COMMON_SUBJECT_FIELDS: ScenePackage['intake'] = [
  {
    id: 'stage',
    kind: 'select',
    label: '学段',
    required: true,
    options: [
      { label: '小学', value: '小学' },
      { label: '初中', value: '初中' },
      { label: '高中', value: '高中' }
    ]
  },
  {
    id: 'subject',
    kind: 'select',
    label: '学科',
    required: true,
    options: ['语文', '数学', '英语', '物理', '化学', '生物', '道德与法治', '历史', '地理'].map(value => ({
      label: value,
      value
    }))
  }
]

const TEXTBOOK_SOURCE_FIELD: ScenePackage['intake'][number] = {
  id: 'source',
  kind: 'source-select',
  label: '数据来源',
  description: '可选；不选择时会根据任务和当前可用能力判断，无法确定时再请你确认。',
  required: false,
  options: [...TEXTBOOK_CATALOGUE_SOURCE_OPTIONS]
}

const KNOWLEDGE_SOURCE_FIELD: ScenePackage['intake'][number] = {
  ...TEXTBOOK_SOURCE_FIELD,
  options: [...SUBJECT_KNOWLEDGE_SOURCE_OPTIONS]
}

const GRADE_FIELD: ScenePackage['intake'][number] = {
  id: 'grade',
  kind: 'select',
  label: '年级',
  required: true,
  options: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '七年级', '八年级', '九年级'].map(
    value => ({ label: value, value })
  )
}

export const BUILTIN_EDUCATION_SCENES = [
  {
    id: 'scene:textbook-course-tree',
    name: '教材课程树',
    description: '按教材版本和册次整理“单元—课程”Excel 目录树。',
    ownership: 'builtin',
    version: 1,
    purposeMode: 'structured',
    roleTemplateId: 'role:textbook-structure',
    intake: [
      ...COMMON_SUBJECT_FIELDS,
      GRADE_FIELD,
      {
        id: 'edition',
        kind: 'text',
        label: '教材版本',
        description: '例如：沪教版、沪教版（五四制）、人教版（2025）。不确定时会提供候选确认。',
        required: false
      },
      {
        id: 'volumes',
        kind: 'multi-select',
        label: '册次',
        description: '可选；不选择时默认同时整理上册和下册，来源没有某一册时会写明缺口。',
        required: false,
        options: [
          { label: '上册', value: 'upper' },
          { label: '下册', value: 'lower' }
        ]
      },
      TEXTBOOK_SOURCE_FIELD
    ],
    sourceRequirements: [
      {
        capability: 'catalogue',
        acceptedKinds: ['xueke', 'shanghai_smartedu', 'private_textbook'],
        required: true
      }
    ],
    outputContracts: [
      {
        id: 'textbook-course-tree-xlsx',
        label: '教材课程树 Excel',
        mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        required: true
      }
    ],
    createdAt: BUILTIN_CREATED_AT,
    updatedAt: BUILTIN_CREATED_AT
  },
  {
    id: 'scene:subject-knowledge-tree',
    name: '学科知识点树',
    description: '按学段和学科整理学科层级知识结构。',
    ownership: 'builtin',
    version: 1,
    purposeMode: 'structured',
    roleTemplateId: 'role:textbook-structure',
    intake: [...COMMON_SUBJECT_FIELDS, KNOWLEDGE_SOURCE_FIELD],
    sourceRequirements: [{ capability: 'catalogue', acceptedKinds: ['xueke', 'private_textbook'], required: true }],
    outputContracts: [
      {
        id: 'subject-knowledge-tree-xlsx',
        label: '学科知识点树 Excel',
        mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        required: true
      }
    ],
    createdAt: BUILTIN_CREATED_AT,
    updatedAt: BUILTIN_CREATED_AT
  },
  {
    id: 'scene:national-smartedu-resource-discovery',
    name: '国家平台教材资源发现',
    description: '按学段、年级、学科和册次整理国家平台官方教材与同步课程导航，不把导航清单冒充课程树。',
    ownership: 'builtin',
    version: 1,
    purposeMode: 'structured',
    roleTemplateId: 'role:official-resource-discovery',
    intake: [
      ...COMMON_SUBJECT_FIELDS,
      GRADE_FIELD,
      {
        id: 'edition',
        kind: 'text',
        label: '教材版本或出版社',
        description: '可填写版本检索词；多个真实候选会要求确认。',
        required: false
      },
      {
        id: 'volumes',
        kind: 'multi-select',
        label: '册次',
        description: '可选；不选择时默认同时发现上册和下册。',
        required: false,
        options: [
          { label: '上册', value: 'upper' },
          { label: '下册', value: 'lower' }
        ]
      },
      {
        id: 'source',
        kind: 'source-select',
        label: '数据来源',
        description: '可选；不选择时默认使用国家智慧教育平台。',
        required: false,
        options: [...NATIONAL_SMARTEDU_SOURCE_OPTIONS]
      }
    ],
    sourceRequirements: [{ capability: 'search', acceptedKinds: ['national_smartedu'], required: true }],
    outputContracts: [
      {
        id: 'national-smartedu-resource-catalog-xlsx',
        label: '国家平台官方资源导航 Excel',
        mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        required: true
      }
    ],
    createdAt: BUILTIN_CREATED_AT,
    updatedAt: BUILTIN_CREATED_AT
  },
  {
    id: 'scene:document-organization',
    name: '文档整理',
    description: '把 PDF、Word 和图片批量整理成可读的结构化产物。',
    ownership: 'builtin',
    version: 1,
    purposeMode: 'required',
    roleTemplateId: 'role:document-organization',
    intake: [
      { id: 'files', kind: 'file-list', label: '资料文件', required: true },
      {
        id: 'outputFormat',
        kind: 'select',
        label: '产物格式',
        description: '可选；未选择时由任务目标和资料类型决定合适的产物格式。',
        required: false,
        options: [
          { label: 'Excel', value: 'xlsx' },
          { label: 'Word', value: 'docx' },
          { label: 'Markdown', value: 'markdown' }
        ]
      }
    ],
    sourceRequirements: [{ capability: 'read', acceptedKinds: ['user_file'], required: true }],
    outputContracts: [
      { id: 'organized-document', label: '文档整理产物', mediaType: 'application/octet-stream', required: true }
    ],
    createdAt: BUILTIN_CREATED_AT,
    updatedAt: BUILTIN_CREATED_AT
  },
  {
    id: 'scene:general-research-task',
    name: '自由教研任务',
    description: '从一段清晰目标和可选参考资料开始，由教研助手组织执行步骤和产物。',
    ownership: 'builtin',
    version: 1,
    purposeMode: 'required',
    roleTemplateId: 'role:teaching-research',
    intake: [],
    sourceRequirements: [],
    outputContracts: [
      { id: 'general-research-artifact', label: '与任务目标匹配的教研产物', mediaType: 'application/octet-stream', required: true }
    ],
    createdAt: BUILTIN_CREATED_AT,
    updatedAt: BUILTIN_CREATED_AT
  }
] as const satisfies readonly ScenePackage[]

export function builtinEducationScene(id: string): ScenePackage | null {
  return BUILTIN_EDUCATION_SCENES.find(scene => scene.id === id) ?? null
}

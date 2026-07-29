import type { ScenePackage } from '../domain/scene'

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

const SOURCE_FIELD: ScenePackage['intake'][number] = {
  id: 'source',
  kind: 'source-select',
  label: '数据来源',
  required: true,
  options: [
    { label: '学科网', value: 'source:xueke' },
    { label: '已配置教材来源', value: 'source:configured-textbook' }
  ]
}

export const BUILTIN_EDUCATION_SCENES = [
  {
    id: 'scene:textbook-course-tree',
    name: '教材课程树',
    description: '按教材版本和册次整理“单元—课程”Excel 目录树。',
    ownership: 'builtin',
    version: 1,
    roleTemplateId: 'role:textbook-structure',
    intake: [
      ...COMMON_SUBJECT_FIELDS,
      {
        id: 'grade',
        kind: 'select',
        label: '年级',
        required: true,
        options: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '七年级', '八年级', '九年级'].map(
          value => ({ label: value, value })
        )
      },
      {
        id: 'edition',
        kind: 'text',
        label: '教材版本',
        description: '例如：沪教版、沪教版（五四制）、人教版（2025）。不确定时会提供候选确认。',
        required: true
      },
      {
        id: 'volumes',
        kind: 'multi-select',
        label: '册次',
        required: true,
        options: [
          { label: '上册', value: 'upper' },
          { label: '下册', value: 'lower' }
        ]
      },
      SOURCE_FIELD
    ],
    sourceRequirements: [{ capability: 'catalogue', acceptedKinds: ['xueke', 'private_textbook'], required: true }],
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
    roleTemplateId: 'role:textbook-structure',
    intake: [...COMMON_SUBJECT_FIELDS, SOURCE_FIELD],
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
    id: 'scene:document-organization',
    name: '文档整理',
    description: '把 PDF、Word 和图片批量整理成可读的结构化产物。',
    ownership: 'builtin',
    version: 1,
    roleTemplateId: 'role:document-organization',
    intake: [
      { id: 'purpose', kind: 'text', label: '整理目的', required: true },
      { id: 'files', kind: 'file-list', label: '资料文件', required: true },
      {
        id: 'outputFormat',
        kind: 'select',
        label: '产物格式',
        required: true,
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
  }
] as const satisfies readonly ScenePackage[]

export function builtinEducationScene(id: string): ScenePackage | null {
  return BUILTIN_EDUCATION_SCENES.find(scene => scene.id === id) ?? null
}

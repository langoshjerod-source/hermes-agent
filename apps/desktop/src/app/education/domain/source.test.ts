import { describe, expect, it } from 'vitest'

import { type EducationSource, toTeacherSourceView } from './source'

describe('teacher-facing education sources', () => {
  it.each([
    ['xueke', '学科网'],
    ['knowledge_base', '知识库'],
    ['web_search', '联网搜索'],
    ['user_file', '我的文件'],
    ['url', '网页地址'],
    ['private_textbook', '已配置教材来源']
  ] as const)('uses the business label for %s', (kind, label) => {
    const source: EducationSource = {
      id: `source:${kind}`,
      kind,
      capabilities: ['read'],
      state: 'available',
      supportedScope: '按已配置范围'
    }

    expect(toTeacherSourceView(source).label).toBe(label)
  })

  it('does not expose a concrete knowledge-base provider', () => {
    const view = toTeacherSourceView({
      id: 'source:knowledge',
      kind: 'knowledge_base',
      capabilities: ['read', 'search'],
      state: 'available',
      supportedScope: '已收录资料',
      technicalProvider: 'RAGFlow'
    })

    expect(JSON.stringify(view)).not.toMatch(/RAGFlow/i)
    expect(view.label).toBe('知识库')
    expect(view).not.toHaveProperty('technicalProvider')
  })

  it('does not expose a private textbook provider', () => {
    const view = toTeacherSourceView({
      id: 'source:private-textbook',
      kind: 'private_textbook',
      capabilities: ['catalogue'],
      state: 'authentication_required',
      supportedScope: '按来源实际范围',
      technicalProvider: '好未来教研云'
    })

    expect(JSON.stringify(view)).not.toMatch(/教研云|好未来/)
    expect(view.label).toBe('已配置教材来源')
  })
})

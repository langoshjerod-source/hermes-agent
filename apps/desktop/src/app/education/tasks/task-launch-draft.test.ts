import { afterEach, describe, expect, it } from 'vitest'

import {
  readEducationTaskLaunchDraft,
  removeEducationTaskLaunchDraft,
  saveEducationTaskLaunchDraft
} from './task-launch-draft'

let draftId: null | string = null

afterEach(() => {
  removeEducationTaskLaunchDraft(draftId)
  draftId = null
})

describe('education task launch draft', () => {
  it('carries multiline purpose and local attachment references across page navigation', () => {
    draftId = saveEducationTaskLaunchDraft({
      purpose: '整理教材资料\n供教研组审核',
      inputAttachments: [
        { id: 'file:/tmp/source.pdf', kind: 'file', label: 'source.pdf', path: '/tmp/source.pdf' }
      ]
    })

    expect(readEducationTaskLaunchDraft(draftId)).toEqual({
      purpose: '整理教材资料\n供教研组审核',
      inputAttachments: [
        { id: 'file:/tmp/source.pdf', kind: 'file', label: 'source.pdf', path: '/tmp/source.pdf' }
      ]
    })

    removeEducationTaskLaunchDraft(draftId)
    expect(readEducationTaskLaunchDraft(draftId)).toBeNull()
  })
})

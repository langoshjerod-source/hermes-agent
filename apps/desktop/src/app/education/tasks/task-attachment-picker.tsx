import { Button } from '@/components/ui/button'
import { attachmentId, pathLabel } from '@/lib/chat-runtime'
import { selectDesktopPaths } from '@/lib/desktop-fs'
import { FileText, ImageIcon, Plus, XIcon } from '@/lib/icons'
import { notifyError } from '@/store/notifications'

import type { TaskInputAttachment } from '../domain/task'

const IMAGE_PATH_PATTERN = /\.(?:avif|bmp|gif|jpe?g|png|svg|tiff?|webp)$/i

export function TaskAttachmentPicker({
  attachments,
  label = '参考资料',
  onChange,
  required = false
}: {
  attachments: TaskInputAttachment[]
  label?: string
  onChange: (attachments: TaskInputAttachment[]) => void
  required?: boolean
}) {
  const pickFiles = async () => {
    let paths: string[]

    try {
      paths = await selectDesktopPaths({
        title: required ? '选择需要处理的资料文件' : '添加任务参考资料',
        directories: false,
        multiple: true
      })
    } catch (error) {
      notifyError(error, '无法添加参考资料')

      return
    }

    if (!paths.length) {
      return
    }

    const next = [...attachments]

    for (const path of paths) {
      const kind = IMAGE_PATH_PATTERN.test(path) ? 'image' : 'file'

      const attachment: TaskInputAttachment = {
        id: attachmentId(kind, path),
        kind,
        label: pathLabel(path),
        path
      }

      const index = next.findIndex(item => item.id === attachment.id)

      if (index >= 0) {
        next[index] = attachment
      } else {
        next.push(attachment)
      }
    }

    onChange(next)
  }

  return (
    <section className="rounded-md border border-(--ui-stroke-tertiary) bg-(--ui-bg-secondary)/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-(--ui-text-primary)">
            {label}
            <span className="ml-1.5 text-xs font-normal text-(--ui-text-tertiary)">
              {required ? '必填' : '可选'}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-(--ui-text-tertiary)">
            支持 PDF、Word、Excel、图片和其他教研资料；执行时会安全传入当前任务会话。
          </p>
        </div>
        <Button onClick={() => void pickFiles()} size="sm" type="button" variant="outline">
          <Plus aria-hidden className="size-4" />
          添加文件
        </Button>
      </div>

      {attachments.length ? (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {attachments.map(attachment => {
            const Icon = attachment.kind === 'image' ? ImageIcon : FileText

            return (
              <li
                className="flex min-w-0 items-center gap-2 rounded-md border border-(--ui-stroke-tertiary) bg-(--ui-bg-primary) px-3 py-2"
                key={attachment.id}
              >
                <Icon aria-hidden className="size-4 shrink-0 text-(--theme-primary)" />
                <span className="min-w-0 flex-1 truncate text-sm text-(--ui-text-secondary)" title={attachment.path}>
                  {attachment.label}
                </span>
                <button
                  aria-label={`移除${attachment.label}`}
                  className="grid size-7 shrink-0 place-items-center rounded-sm text-(--ui-text-tertiary) hover:bg-(--chrome-action-hover) hover:text-(--ui-text-primary)"
                  onClick={() => onChange(attachments.filter(item => item.id !== attachment.id))}
                  type="button"
                >
                  <XIcon aria-hidden className="size-4" />
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}

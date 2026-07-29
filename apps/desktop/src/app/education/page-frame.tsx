import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function EducationPageFrame({
  children,
  className,
  description,
  eyebrow,
  title
}: {
  children: ReactNode
  className?: string
  description: string
  eyebrow: string
  title: string
}) {
  return (
    <section
      className={cn(
        'h-full min-h-0 overflow-y-auto bg-(--ui-chat-surface-background) px-4 pb-10 pt-[calc(var(--titlebar-height)+1.25rem)] sm:px-6 lg:px-8',
        className
      )}
    >
      <div className="mx-auto w-full max-w-6xl">
        <header className="max-w-3xl">
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-(--theme-primary)">
            {eyebrow}
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-(--ui-text-primary) sm:text-3xl">
            {title}
          </h1>
          <p className="mt-3 max-w-[65ch] text-sm leading-6 text-(--ui-text-secondary)">{description}</p>
        </header>
        {children}
      </div>
    </section>
  )
}

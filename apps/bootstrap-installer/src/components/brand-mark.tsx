import { cn } from '../lib/utils'

const assetPath = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

// Official MengXueBan mascot, shared with the desktop shell.
export function BrandMark({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'inline-flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm',
        className
      )}
      {...props}
    >
      <img alt="" className="size-full object-contain" src={assetPath('mengxueban-mark.svg')} />
    </span>
  )
}

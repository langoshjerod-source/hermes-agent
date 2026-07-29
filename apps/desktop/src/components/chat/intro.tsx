import { BrandMark } from '@/components/brand-mark'

export interface IntroProps {
  personality?: string
  seed?: number
}

const BRAND_SLOGAN = '以科技行因材施教，以普惠守有教无类'

export function Intro(_props: IntroProps) {
  return (
    <div
      className="pointer-events-none flex w-full min-w-0 flex-col items-center justify-center px-4 py-8 text-center sm:px-8"
      data-slot="aui_intro"
    >
      <BrandMark
        aria-label="萌学伴 Logo"
        className="size-28 rounded-[2rem] border border-border/50 bg-white/90 p-2.5 shadow-sm sm:size-32 dark:bg-white/95"
        role="img"
      />
      <p className="mt-5 max-w-xl text-balance text-base font-medium leading-relaxed tracking-[0.08em] text-midground sm:text-lg">
        {BRAND_SLOGAN}
      </p>
    </div>
  )
}

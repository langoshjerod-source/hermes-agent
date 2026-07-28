import { BrandMark } from '../components/brand-mark'
import { HackeryButton } from '../components/hackery-button'
import { startInstall } from '../store'

/*
 * Welcome screen.
 *
 * A compact official-brand welcome surface. Technical Hermes terminology is
 * intentionally kept out of the learner-facing layer.
 */
export default function Welcome() {
  return (
    <div className="hermes-fade-in flex h-full flex-col items-center justify-center gap-10 px-12 py-10">
      <div className="w-full max-w-2xl min-w-0 text-center">
        <BrandMark className="mxb-installer-mark mx-auto mb-5 size-24 rounded-[1.6rem] p-2" />
        <h1 className="m-0 text-4xl font-bold tracking-[0.08em] text-primary">萌学伴</h1>
        <p className="mt-2 text-sm font-medium tracking-[0.32em] text-midground">MENG XUE BAN</p>
        <p className="mt-5 text-base leading-normal tracking-tight text-muted-foreground">
          每个孩子的成长伙伴。首次使用需要几分钟完成环境准备。
        </p>
      </div>

      <HackeryButton label="开始安装" onClick={() => void startInstall()} />
    </div>
  )
}

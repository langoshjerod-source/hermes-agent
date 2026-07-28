import { AlertCircle } from 'lucide-react'
import { useState } from 'react'

import { BrandMark } from '../components/brand-mark'
import { HackeryButton } from '../components/hackery-button'
import { launchHermesDesktop } from '../store'

/*
 * Success screen keeps the official mascot as the visual anchor.
 *
 * Launching the desktop can fail (e.g. Stage-Desktop was skipped and
 * Hermes.exe doesn't exist). We catch the Tauri error and surface it
 * inline rather than silently doing nothing — the previous version
 * had `onClick={() => void launchHermesDesktop()}` which swallowed
 * the rejection and left the user staring at an unresponsive button.
 */
export default function Success() {
  const [error, setError] = useState<string | null>(null)
  const [launching, setLaunching] = useState(false)

  async function handleLaunch() {
    setError(null)
    setLaunching(true)

    try {
      await launchHermesDesktop()
      // On success the installer exits — control never returns here.
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      setLaunching(false)
    }
  }

  return (
    <div className="hermes-fade-in flex h-full flex-col items-center justify-center gap-8 px-12 py-10">
      <div className="w-full max-w-2xl min-w-0 text-center">
        <BrandMark className="mx-auto mb-5 size-20 rounded-[1.4rem] p-1.5" />
        <h1 className="m-0 text-4xl font-bold tracking-tight text-primary">萌学伴准备好了</h1>

        <p className="m-0 text-center text-base leading-normal tracking-tight text-muted-foreground">
          点击下方按钮即可进入萌学伴。
        </p>
      </div>

      <HackeryButton
        disabled={launching}
        label={launching ? '正在启动' : '进入萌学伴'}
        loading={launching}
        onClick={() => void handleLaunch()}
      />

      {error && (
        <div className="flex max-w-2xl items-start gap-2 text-sm" role="alert">
          <AlertCircle className="mt-0.5 shrink-0 text-destructive" size={16} />
          <div className="min-w-0">
            <div className="font-medium text-destructive">萌学伴启动失败</div>
            <div className="mt-0.5 text-muted-foreground">{error}</div>
          </div>
        </div>
      )}
    </div>
  )
}

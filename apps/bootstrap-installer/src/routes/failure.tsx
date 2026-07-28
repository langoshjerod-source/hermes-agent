import { useStore } from '@nanostores/react'
import { FileText, RefreshCw } from 'lucide-react'

import { Button } from '../components/button'
import { $logPath, $mode, type BootstrapStateModel, openLogDir, startInstall, startUpdate } from '../store'

interface FailureProps {
  bootstrap: BootstrapStateModel
}

/*
 * Failure screen. Same hero treatment as Welcome/Success — the wordmark
 * carries the brand, so we keep it across every terminal state.
 *
 * The actual error message lives below in muted text. Two affordances on
 * shared Button tokens: Retry (primary) and Open logs (quiet text link).
 */
export default function Failure({ bootstrap }: FailureProps) {
  const logPath = useStore($logPath)
  const mode = useStore($mode)
  const isUpdate = mode === 'update'

  return (
    <div className="hermes-fade-in flex h-full flex-col items-center justify-center gap-6 px-12 py-10">
      <div className="w-full max-w-2xl min-w-0 text-center">
        <h1 className="m-0 mb-4 text-4xl font-bold tracking-tight text-destructive">
          {isUpdate ? '更新未完成' : '安装未完成'}
        </h1>

        <p className="m-0 mx-auto max-w-xl text-center text-sm leading-normal tracking-tight text-muted-foreground">
          {bootstrap.error ??
            (isUpdate ? '更新过程中出现问题，请重试或查看日志。' : '安装过程中出现问题，请重试或查看日志。')}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button className="gap-1.5" onClick={() => void (isUpdate ? startUpdate() : startInstall())}>
          <RefreshCw />
          {isUpdate ? '重新更新' : '重新安装'}
        </Button>
        <Button className="gap-1.5" onClick={() => void openLogDir()} variant="text">
          <FileText />
          打开日志
        </Button>
      </div>

      {logPath && (
        <p className="max-w-lg text-center text-xs text-muted-foreground/70">
          日志：<code className="font-mono">{logPath}</code>
        </p>
      )}
    </div>
  )
}

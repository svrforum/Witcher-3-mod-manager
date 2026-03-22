interface IpcResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

interface ElectronAPI {
  invoke: <T = unknown>(channel: string, ...args: unknown[]) => Promise<IpcResult<T>>
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void
  windowMinimize: () => void
  windowMaximize: () => void
  windowClose: () => void
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}

export {}

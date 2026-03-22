import { useCallback } from 'react'

export function useIpc() {
  const invoke = useCallback(async <T = unknown>(channel: string, ...args: unknown[]): Promise<T> => {
    const result = await window.api.invoke(channel, ...args)
    if (!result.success) {
      throw new Error(result.error || 'Unknown error')
    }
    return result.data as T
  }, [])

  return { invoke }
}

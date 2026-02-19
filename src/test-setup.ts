import { vi } from 'vitest'

// Mock chrome storage
const storageData: Record<string, unknown> = {}

const mockChrome = {
  storage: {
    local: {
      get: vi.fn((keys: string | string[] | null, callback?: (result: Record<string, unknown>) => void) => {
        const result: Record<string, unknown> = {}
        const keyList = keys === null ? Object.keys(storageData) : (Array.isArray(keys) ? keys : [keys])
        for (const key of keyList) {
          if (key in storageData) result[key] = storageData[key]
        }
        if (callback) callback(result)
        return Promise.resolve(result)
      }),
      set: vi.fn((items: Record<string, unknown>, callback?: () => void) => {
        Object.assign(storageData, items)
        if (callback) callback()
        return Promise.resolve()
      }),
      clear: vi.fn((callback?: () => void) => {
        Object.keys(storageData).forEach(k => delete storageData[k])
        if (callback) callback()
        return Promise.resolve()
      }),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    getURL: vi.fn((path: string) => `chrome-extension://test-id/${path}`),
  },
}

// @ts-ignore
globalThis.chrome = mockChrome

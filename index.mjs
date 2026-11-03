// Magpie 的 Breeze Blue provider 插件接线：config/auth/provider 三个 hook，
// 具体的请求映射与 HTTP 逻辑都在 lib/breeze.mjs。
import {
  BALANCE_PLAN,
  BREEZE_BASE_URL,
  breezeBalance,
  createBreezeSpeechFetch,
} from './lib/breeze.mjs'

const PROVIDER_ID = 'breeze'
const MODEL_ID = 'breeze-tts-2'

function modelDeclaration() {
  return {
    name: 'Breeze TTS 2',
    capabilities: { input: { text: true }, output: { audio: true } },
    limit: { context: 1000, output: 0 },
    tool_call: false,
  }
}

// Magpie 会把模块导出的函数都当作插件，因此这里只导出默认工厂。
export default async function breezePlugin() {
  return {
    config: async (config) => {
      config.provider ??= {}
      const existing = config.provider[PROVIDER_ID] ?? {}
      config.provider[PROVIDER_ID] = {
        name: 'BreezeBlue',
        npm: '@ai-sdk/openai-compatible',
        api: BREEZE_BASE_URL,
        ...existing,
        models: {
          ...(existing.models ?? {}),
          [MODEL_ID]: {
            ...modelDeclaration(),
            ...(existing.models?.[MODEL_ID] ?? {}),
          },
        },
      }
    },

    auth: {
      provider: PROVIDER_ID,
      methods: [{ type: 'api', label: 'Breeze API key', placeholder: 'brz_…' }],

      async loader(getAuth) {
        let auth
        try {
          auth = await getAuth()
        } catch {
          return {}
        }
        const key = auth?.type === 'api' && typeof auth.key === 'string' ? auth.key : ''
        if (!key) return {}
        return {
          baseURL: BREEZE_BASE_URL,
          fetch: createBreezeSpeechFetch(key),
        }
      },

      // 余额只用于 Magpie 的 provider 卡片/usage；按 DeepSeek 的 balance-only 方式显示。
      async usage(getAuth) {
        try {
          const auth = await getAuth()
          const usage = await breezeBalance(auth?.key)
          const wallet = Array.isArray(usage.windows) ? usage.windows[0] : null
          if (!wallet) {
            return {
              plan: BALANCE_PLAN,
              windows: [],
              ...(usage.error ? { error: usage.error } : {}),
            }
          }
          const amount = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(wallet.balance)
          return {
            plan: BALANCE_PLAN,
            balance: `${amount} ${wallet.unit}`,
          }
        } catch (error) {
          return {
            plan: BALANCE_PLAN,
            windows: [],
            error: `Breeze balance: ${error?.message ?? String(error)}`,
          }
        }
      },
    },

    provider: {
      id: PROVIDER_ID,
      async models(provider) {
        return provider?.models ?? { [MODEL_ID]: modelDeclaration() }
      },
    },
  }
}

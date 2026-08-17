import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { DeepSeekHarness } from '@deepseek-ai/dsh-sdk-client'

const require = createRequire(import.meta.url)

const runtimeBin = require.resolve(
  '@deepseek-ai/dsh-sdk-jsonrpc-demo/bin'
)

const cordisConfig = resolve('./minimal.cordis.yml')

console.log('Runtime:', runtimeBin)
console.log('Config:', cordisConfig)

const harness = new DeepSeekHarness({
  launch: {
    command: process.execPath,
    args: [
      runtimeBin,
      cordisConfig,
    ],
  },

  provider: 'deepseek-official',
  model: process.env.DSH_MODEL ?? 'deepseek-v4-flash',
  maxTokens: 4096,
})

try {
  console.log('Starting DSH...')

  const result = await harness.run(
    'Reply with exactly: DSH SDK WORKS'
  )

  console.log('\n--- RESULT ---')
  console.log('Session:', result.sessionId)
  console.log('Response:', result.finalResponse)
} finally {
  await harness.close()
}
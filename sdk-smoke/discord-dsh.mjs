import {
  Client,
  GatewayIntentBits,
} from 'discord.js'

import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { DeepSeekHarness } from '@deepseek-ai/dsh-sdk-client'


// ---------- DSH runtime ----------

const require = createRequire(import.meta.url)

const runtimeBin = require.resolve(
  '@deepseek-ai/dsh-sdk-jsonrpc-demo/bin'
)

const cordisConfig = resolve('./minimal.cordis.yml')

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


// ---------- Discord client ----------

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
})

client.once('clientReady', () => {
  console.log(`Discord logged in as ${client.user.tag}`)
})

client.on('messageCreate', async (message) => {
  // Ignore messages sent by bots, including ourselves
  if (message.author.bot) return

  console.log(
    `[message] ${message.author.username}: ${message.content}`
  )

  try {
    await message.channel.sendTyping()

    const sessionId = `discord-${message.channelId}`

    const result = await harness.run(
      message.content,
      {
        sessionId,
      }
    )

    console.log(`[DSH session] ${result.sessionId}`)
    console.log(`[DSH response] ${result.finalResponse}`)

    await message.reply(result.finalResponse)

  } catch (error) {
    console.error('DSH error:', error)

    await message.reply(
      'DSH encountered an error while processing your message.'
    )
  }
})


// ---------- Start ----------

await client.login(process.env.DISCORD_BOT_TOKEN)
import {
  Client,
  GatewayIntentBits,
} from 'discord.js'

import { classifyDiscordInput } from './discord-input.mjs'
import {
  withTyping,
} from './typing-indicator.mjs'
import {
  addProcessingReaction,
  markSuccess,
  markFailure,
} from './discord-reactions.mjs'  
import {
  sendDiscordResponse,
} from './discord-output.mjs'
import { enqueueSession } from './session-queue.mjs'
import { getRunError } from './dsh-result.mjs'
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
  if (message.author.bot) return

  const discordInput = classifyDiscordInput(message)

  if (discordInput.type === 'empty') {
    return
  }

  if (discordInput.type === 'attachment-only') {
    await message.reply(
      'Attachments are not supported yet. Please send a text message.',
    )

    return
  }

  const input = discordInput.input

  const processingReaction =
    await addProcessingReaction(message)

  const sessionId =
    `discord-${message.channelId}`

  try {
    await enqueueSession(sessionId, async () => {
      await message.channel.sendTyping()

      const result = await withTyping(
        message.channel,
        () =>
          harness.run(
            input,
            {
              sessionId,
            },
          ),
      )

      const runError = getRunError(result)

      if (runError) {
        await markFailure(
          message,
          processingReaction,
        )

        await message.reply(
          `DSH failed: ${runError.code}`,
        )

        return
      }

      if (!result.finalResponse?.trim()) {
        await markFailure(
          message,
          processingReaction,
        )

        await message.reply(
          'DSH finished without returning a response.',
        )

        return
      }

      await sendDiscordResponse(
        message,
        result.finalResponse,
      )

      await markSuccess(
        message,
        processingReaction,
      )
    })
  } catch (error) {
    console.error('DSH error:', error)

    await markFailure(
      message,
      processingReaction,
    )

    await message.reply(
      'DSH encountered an error while processing your message.',
    )
  }
})

// ---------- Graceful shutdown ----------

let shuttingDown = false

async function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true

  console.log(`[shutdown] Received ${signal}`)

  try {
    client.destroy()

    await harness.close()

    console.log('[shutdown] DSH closed cleanly')
  } catch (error) {
    console.error('[shutdown] Error during shutdown:', error)
  } finally {
    process.exit(signal === 'SIGINT' ? 130 : 0)
  }
}

process.once('SIGINT', () => {
  void shutdown('SIGINT')
})

process.once('SIGTERM', () => {
  void shutdown('SIGTERM')
})


// ---------- Start ----------

await client.login(process.env.DISCORD_BOT_TOKEN)
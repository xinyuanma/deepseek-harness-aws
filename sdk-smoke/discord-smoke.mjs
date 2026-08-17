import {
  Client,
  GatewayIntentBits,
} from 'discord.js'

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
})

client.once('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}`)
})

client.on('messageCreate', async (message) => {
  if (message.author.bot) return

  console.log(
    `[message] ${message.author.username}: ${message.content}`
  )

  if (message.content === 'ping') {
    await message.reply('pong')
  }
})

await client.login(process.env.DISCORD_BOT_TOKEN)
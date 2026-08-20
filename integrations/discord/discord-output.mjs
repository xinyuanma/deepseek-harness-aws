const DISCORD_MESSAGE_LIMIT = 2000
const SAFE_CHUNK_SIZE = 1850

export function splitDiscordMessage(text) {
  const content = text?.trim()

  if (!content) {
    return []
  }

  const chunks = []
  let remaining = content

  while (remaining.length > SAFE_CHUNK_SIZE) {
    let splitAt = remaining.lastIndexOf(
      '\n',
      SAFE_CHUNK_SIZE,
    )

    if (splitAt <= 0) {
      splitAt = remaining.lastIndexOf(
        ' ',
        SAFE_CHUNK_SIZE,
      )
    }

    if (splitAt <= 0) {
      splitAt = SAFE_CHUNK_SIZE
    }

    chunks.push(
      remaining.slice(0, splitAt).trim(),
    )

    remaining =
      remaining.slice(splitAt).trimStart()
  }

  if (remaining) {
    chunks.push(remaining)
  }

  return chunks
}


export async function sendDiscordResponse(
  message,
  text,
) {
  const chunks = splitDiscordMessage(text)

  if (chunks.length === 0) {
    return
  }

  const total = chunks.length

  const formattedChunks = chunks.map(
    (chunk, index) => {
      if (total === 1) {
        return chunk
      }

      return `${chunk}\n\n(${index + 1}/${total})`
    },
  )

  await message.reply(formattedChunks[0])

  for (const chunk of formattedChunks.slice(1)) {
    await message.channel.send(chunk)
  }
}
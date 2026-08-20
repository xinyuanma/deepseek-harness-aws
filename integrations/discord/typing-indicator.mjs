export async function withTyping(
  channel,
  task,
) {
  let stopped = false

  const sendTyping = async () => {
    if (stopped) return

    try {
      await channel.sendTyping()
    } catch (error) {
      console.warn(
        '[discord] Failed to send typing indicator:',
        error,
      )
    }
  }

  await sendTyping()

  const interval = setInterval(
    () => {
      void sendTyping()
    },
    8000,
  )

  try {
    return await task()
  } finally {
    stopped = true
    clearInterval(interval)
  }
}

export function classifyDiscordInput(message) {
  const input = message.content.trim()
  const hasAttachments = message.attachments.size > 0

  if (!input) {
    if (hasAttachments) {
      return {
        type: 'attachment-only',
        input: '',
      }
    }

    return {
      type: 'empty',
      input: '',
    }
  }

  return {
    type: 'text',
    input,
  }
}

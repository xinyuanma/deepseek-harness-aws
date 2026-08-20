export async function addProcessingReaction(message) {
  try {
    return await message.react('👀')
  } catch (error) {
    console.warn(
      '[discord] Failed to add processing reaction:',
      error,
    )
    return null
  }
}

export async function markSuccess(
  message,
  processingReaction,
) {
  try {
    if (processingReaction) {
      await processingReaction.remove()
    }

    await message.react('✅')
  } catch (error) {
    console.warn(
      '[discord] Failed to mark success:',
      error,
    )
  }
}

export async function markFailure(
  message,
  processingReaction,
) {
  try {
    if (processingReaction) {
      await processingReaction.remove()
    }

    await message.react('❌')
  } catch (error) {
    console.warn(
      '[discord] Failed to mark failure:',
      error,
    )
  }
}

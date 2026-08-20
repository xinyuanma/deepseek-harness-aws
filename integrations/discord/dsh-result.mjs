export function getRunError(result) {
  for (let i = result.events.length - 1; i >= 0; i--) {
    const event = result.events[i]

    if (event?.type !== 'turn/end') {
      continue
    }

    const reason = event.data?.reason

    if (reason?.kind !== 'error') {
      return null
    }

    return {
      code: reason.error?.code ?? 'UNKNOWN_ERROR',
      message: reason.error?.message ?? 'Unknown DSH error',
    }
  }

  return null
}
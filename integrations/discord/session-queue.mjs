const queues = new Map()

export function enqueueSession(sessionId, task) {
  const previous = queues.get(sessionId) ?? Promise.resolve()

  const current = previous
    .catch(() => {
      // Previous task failure must not block later tasks.
    })
    .then(task)

  queues.set(sessionId, current)

  const cleanup = () => {
    if (queues.get(sessionId) === current) {
      queues.delete(sessionId)
    }
  }

  void current.then(cleanup, cleanup)

  return current
}
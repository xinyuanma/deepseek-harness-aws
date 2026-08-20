const queues = new Map()

export function enqueueSession(sessionId, task) {
  const previous = queues.get(sessionId) ?? Promise.resolve()

  const current = previous
    .catch(() => {
      // 前一个任务失败也不能阻塞后续任务
    })
    .then(task)

  queues.set(sessionId, current)

  current.finally(() => {
    if (queues.get(sessionId) === current) {
      queues.delete(sessionId)
    }
  })

  return current
}
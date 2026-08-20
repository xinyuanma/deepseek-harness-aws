import test from 'node:test'
import assert from 'node:assert/strict'

import {
  enqueueSession,
} from './session-queue.mjs'

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

test('serializes tasks in the same session', async () => {
  const events = []

  const first = enqueueSession(
    'same-session',
    async () => {
      events.push('first-start')
      await sleep(30)
      events.push('first-end')
    },
  )

  const second = enqueueSession(
    'same-session',
    async () => {
      events.push('second-start')
      events.push('second-end')
    },
  )

  await Promise.all([
    first,
    second,
  ])

  assert.deepEqual(events, [
    'first-start',
    'first-end',
    'second-start',
    'second-end',
  ])
})

test('allows different sessions to run concurrently', async () => {
  const events = []

  const first = enqueueSession(
    'session-a',
    async () => {
      events.push('a-start')
      await sleep(30)
      events.push('a-end')
    },
  )

  const second = enqueueSession(
    'session-b',
    async () => {
      events.push('b-start')
      await sleep(5)
      events.push('b-end')
    },
  )

  await Promise.all([
    first,
    second,
  ])

  assert.equal(events[0], 'a-start')
  assert.equal(events[1], 'b-start')

  assert.ok(
    events.indexOf('b-end') <
      events.indexOf('a-end'),
  )
})

test('continues queue after a task fails', async () => {
  const events = []

  const failed = enqueueSession(
    'failure-session',
    async () => {
      events.push('failed-start')
      throw new Error('expected test failure')
    },
  )

  const next = enqueueSession(
    'failure-session',
    async () => {
      events.push('next-start')
      return 'success'
    },
  )

  await assert.rejects(
    failed,
    /expected test failure/,
  )

  const result = await next

  assert.equal(result, 'success')

  assert.deepEqual(events, [
    'failed-start',
    'next-start',
  ])
})

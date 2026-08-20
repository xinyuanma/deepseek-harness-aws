import test from 'node:test'
import assert from 'node:assert/strict'

import {
  classifyDiscordInput,
} from './discord-input.mjs'

function createMessage({
  content = '',
  attachmentCount = 0,
} = {}) {
  return {
    content,
    attachments: {
      size: attachmentCount,
    },
  }
}

test('classifies normal text', () => {
  const result = classifyDiscordInput(
    createMessage({
      content: 'hello',
    }),
  )

  assert.deepEqual(result, {
    type: 'text',
    input: 'hello',
  })
})

test('trims surrounding whitespace', () => {
  const result = classifyDiscordInput(
    createMessage({
      content: '   hello world   ',
    }),
  )

  assert.deepEqual(result, {
    type: 'text',
    input: 'hello world',
  })
})

test('classifies empty message', () => {
  const result = classifyDiscordInput(
    createMessage(),
  )

  assert.deepEqual(result, {
    type: 'empty',
    input: '',
  })
})

test('classifies whitespace-only message as empty', () => {
  const result = classifyDiscordInput(
    createMessage({
      content: '   \n\t   ',
    }),
  )

  assert.deepEqual(result, {
    type: 'empty',
    input: '',
  })
})

test('classifies attachment-only message', () => {
  const result = classifyDiscordInput(
    createMessage({
      attachmentCount: 1,
    }),
  )

  assert.deepEqual(result, {
    type: 'attachment-only',
    input: '',
  })
})

test('text with attachment is handled as text', () => {
  const result = classifyDiscordInput(
    createMessage({
      content: 'describe this later',
      attachmentCount: 1,
    }),
  )

  assert.deepEqual(result, {
    type: 'text',
    input: 'describe this later',
  })
})

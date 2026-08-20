import {
  Config as OfficialConfig,
  HarnessSdkJsonRpcServer,
} from '@deepseek-ai/dsh-sdk-jsonrpc-server'

import {
  JsonRpcLineTransport,
} from '@deepseek-ai/dsh-sdk-protocol'

import {
  SessionId,
} from '@deepseek-ai/dsh-session'


export const name = 'resume-sdk-jsonrpc-server'
export const inject = ['agents']
export const Config = OfficialConfig


class ResumeAwareHarnessSdkJsonRpcServer
  extends HarnessSdkJsonRpcServer {

  async createSession(sessionId) {
    const id = SessionId(sessionId)

    const agentOptions = {
      provider: this.provider,
      model: this.model,
      ...(this.maxTokens === undefined
        ? {}
        : { maxTokens: this.maxTokens }),
    }

    let handle

    const persistence =
      this.ctx.get('sessionPersistence')

    if (persistence !== undefined) {
      try {
        handle = await this.ctx.agents.resume({
          resumeSessionId: id,
          agentOptions,
        })
      } catch (error) {
        const exists = (await persistence.list())
          .some(header => header.id === id)

        if (exists) {
          throw error
        }
      }
    }

    if (handle === undefined) {
      handle = await this.ctx.agents.create({
        sessionId: id,
        meta: {
          cwd: this.cwd,
        },
        agentOptions,
      })
    }

    const rec = { handle }

    this.sessions.set(sessionId, rec)

    return rec
  }
}


export function apply(ctx, config) {
  const rootFiber = ctx.root.fiber

  const input =
    config.input ?? process.stdin

  const output =
    config.output ?? process.stdout

  const exit =
    config.exit ??
    ((code) => {
      process.exit(code)
    })

  const transport =
    new JsonRpcLineTransport(input, output)

  const server =
    new ResumeAwareHarnessSdkJsonRpcServer(
      ctx,
      transport,
      {
        maxTokensAsSuccess:
          config.maxTokensAsSuccess ?? false,
      },
    )

  let exitTask

  const disposeAndExit = () => {
    exitTask ??= (async () => {
      await Promise.allSettled([
        Promise.resolve()
          .then(() => transport.flush()),
      ])

      await Promise.allSettled([
        Promise.resolve()
          .then(() => rootFiber.dispose()),
      ])

      exit(0)
    })()

    return exitTask
  }

  transport.onRequest(
    async (method, params) => {
      if (method === 'initialize') {
        await ctx.get('loader')?.await()
      }

      const result =
        await server.handleRequest(
          method,
          params,
        )

      if (method === 'shutdown') {
        setImmediate(() => {
          void disposeAndExit()
        })
      }

      return result
    },
  )

  ctx.effect(
    () => {
      transport.start()

      return async () => {
        await server.shutdown()
        transport.close()
      }
    },
    'jsonrpc.serve',
  )
}

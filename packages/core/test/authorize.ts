import test from 'ava'
import { BasedCoreClient } from '../src/index'
import createServer, { isHttpClient } from '@based/server'
import { BasedError, BasedErrorCode } from '../src/types/error'
import { wait } from '@saulx/utils'

const setup = async () => {
  const coreClient = new BasedCoreClient()

  const store = {
    hello: {
      observable: false,
      function: async (payload: any) => {
        return payload.length
      },
    },
    counter: {
      observable: true,
      function: async (_payload: any, update: any) => {
        let cnt = 0
        const counter = setInterval(() => {
          console.log({ counter })
          update(++cnt)
        }, 100)
        return () => {
          console.log('clear')
          clearInterval(counter)
        }
      },
    },
  }

  const server = await createServer({
    port: 9910,
    functions: {
      memCacheTimeout: 3e3,
      idleTimeout: 3e3,
      unregister: async () => {
        return true
      },
      register: async ({ name }) => {
        if (store[name]) {
          return {
            name,
            checksum: 1,
            ...store[name],
          }
        } else {
          return false
        }
      },
      log: (opts) => {
        console.info('-->', opts)
      },
    },
  })
  return { coreClient, server }
}

test.serial('authorize functions', async (t) => {
  t.timeout(1000)

  const token = 'mock_token'

  const { coreClient, server } = await setup()

  server.auth.updateConfig({
    authorize: async (_server, client) => {
      if (isHttpClient(client)) {
        if (client.context) {
          return client.context.authState === token
        }
      } else {
        if (client.ws) {
          return client.ws.authState === token
        }
      }
      return false
    },
  })

  t.teardown(() => {
    coreClient.disconnect()
    server.destroy()
  })

  await coreClient.connect({
    url: async () => {
      return 'ws://localhost:9910'
    },
  })

  await t.throwsAsync(
    coreClient.function('hello', {
      bla: true,
    })
  )
  await coreClient.auth(token)
  await t.notThrowsAsync(
    coreClient.function('hello', {
      bla: true,
    })
  )
})

test.serial('authorize observe', async (t) => {
  t.timeout(12000)

  const token = 'mock_token'

  const { coreClient, server } = await setup()

  server.functions.update({
    observable: true,
    name: 'counter',
    // memCacheTimeout: 2e3,
    checksum: 2,
    function: async (_payload: any, update: any) => {
      let cnt = 0
      const counter = setInterval(() => {
        update('UpdatedFn' + ++cnt)
      }, 100)
      return () => {
        clearInterval(counter)
      }
    },
  })

  server.auth.updateConfig({
    authorize: async (_server, client) => {
      if (isHttpClient(client)) {
        if (client.context) {
          return client.context.authState === token
        }
      } else {
        if (client.ws) {
          return client.ws.authState === token
        }
      }
      return false
    },
  })

  t.teardown(() => {
    coreClient.disconnect()
    server.destroy()
  })

  await coreClient.connect({
    url: async () => {
      return 'ws://localhost:9910'
    },
  })

  let clear: () => void
  await new Promise((resolve) => {
    clear = coreClient.observe(
      'counter',
      (d) => {
        console.info({ d })
      },
      {
        myQuery: 123,
      },
      (err: BasedError) => {
        t.is(err.basedCode, BasedErrorCode.AuthorizeRejectedError)
        resolve(err)
      }
    )
  })

  // TODO: won't work if we don't clear the observable
  clear()

  await coreClient.auth(token)
  await new Promise((resolve) => setTimeout(resolve, 2000))

  await new Promise((resolve) => {
    console.info('go go go')
    coreClient.observe(
      'counter',
      (d) => {
        console.info({ d })
        resolve(d)
      },
      {
        myQuery: 123,
      },
      (err: BasedError) => {
        console.log('>>>>', err)
        t.fail('Should not error when authed')
        resolve(err)
      }
    )
  })
})

test.serial.only('authorize after observe', async (t) => {
  t.timeout(12000)

  const token = 'mock_token'

  const { coreClient, server } = await setup()

  server.functions.update({
    observable: true,
    name: 'counter',
    // memCacheTimeout: 2e3,
    checksum: 2,
    function: async (_payload: any, update: any) => {
      let cnt = 0
      const counter = setInterval(() => {
        console.log({ cnt })
        update('UpdatedFn' + ++cnt)
      }, 100)
      return () => {
        clearInterval(counter)
      }
    },
  })

  server.auth.updateConfig({
    authorize: async (_server, client) => {
      if (isHttpClient(client)) {
        if (client.context) {
          return client.context.authState === token
        }
      } else {
        if (client.ws) {
          return client.ws.authState === token
        }
      }
      return false
    },
  })

  t.teardown(() => {
    coreClient.disconnect()
    server.destroy()
  })

  await coreClient.connect({
    url: async () => {
      return 'ws://localhost:9910'
    },
  })
  await wait(500)

  let receiveCnt = 0

  console.log('setting')
  /* const clear = */ coreClient.observe(
    'counter',
    (d) => {
      console.info({ d })
      receiveCnt++
    },
    {
      myQuery: 123,
    },
    (err: BasedError) => {
      t.is(err.basedCode, BasedErrorCode.AuthorizeRejectedError)
    }
  )

  await wait(2000)
  console.log('wawa')
  await coreClient.auth(token)
  await wait(2000)

  t.true(receiveCnt > 0)

  // TODO: causes an exception
  // clear()
})

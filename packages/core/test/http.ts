import test from 'ava'
import createServer from '@based/server'
import { wait } from '@saulx/utils'
import fetch from 'cross-fetch'

test.serial.only('functions (over http)', async (t) => {
  const store = {
    hello: {
      path: '/flap',
      name: 'hello',
      checksum: 1,
      function: async (payload) => {
        if (payload) {
          return payload
        }
        return 'flap'
      },
      customHttpResponse: async (result, payload, client) => {
        const { res, isAborted } = client
        if (isAborted) {
          return
        }
        // just make a return thing
        // { headers: {} , status: , reply }
        // send() can be wrapped in the based fn header

        res.writeStatus('200 OkiDoki')
        if (typeof result === 'object') {
          res.end(JSON.stringify(result))
          return true
        }
        res.end('yesh ' + result)
        return true
      },
    },
  }

  const server = await createServer({
    port: 9910,
    functions: {
      memCacheTimeout: 3e3,
      idleTimeout: 3e3,

      route: ({ name, path }) => {
        if (path) {
          for (const name in store) {
            if (store[name].path === path) {
              return {
                name: store[name].name,
                observable: store[name].observable,
              }
            }
          }
        } else if (name && store[name]) {
          return { name }
        }
        return false
      },

      uninstall: async () => {
        await wait(1e3)
        return true
      },

      install: async ({ name }) => {
        if (store[name]) {
          return store[name]
        } else {
          return false
        }
      },

      log: (opts) => {
        console.info('-->', opts)
      },
    },
  })

  const result = await (await fetch('http://localhost:9910/flap')).text()

  t.is(result, 'yesh flap')

  const result2 = await (
    await fetch('http://localhost:9910/flap?flurp=1')
  ).text()

  t.is(result2, '{"flurp":1}')

  const result3 = await (
    await fetch('http://localhost:9910/flap', {
      method: 'post',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ flurp: 1 }),
    })
  ).text()

  t.is(result3, '{"flurp":1}')

  const x = await (await fetch('http://localhost:9910/gurk')).text()

  t.is(x, `404 Not Found`)

  await wait(10e3)

  t.is(Object.keys(server.functions.functions).length, 0)

  server.destroy()
})

test.serial('get (over http)', async (t) => {
  const store = {
    hello: {
      path: '/counter',
      name: 'counter',
      checksum: 1,
      observable: true,
      function: async (payload, update) => {
        let cnt = 0
        const counter = setInterval(() => {
          update(++cnt)
        }, 1000)
        return () => {
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
      route: ({ name, path }) => {
        if (path) {
          for (const name in store) {
            if (store[name].path === path) {
              return { name: store[name], observable: store[name].observable }
            }
          }
        } else if (name && store[name]) {
          return { name, observable: store[name].observable }
        }
        return false
      },
      uninstall: async () => {
        return true
      },
      install: async ({ name }) => {
        if (store[name]) {
          return store[name]
        } else {
          return false
        }
      },
      log: (opts) => {
        console.info('-->', opts)
      },
    },
  })

  const result = await (await fetch('http://localhost:9910/counter')).text()

  t.is(result, '1')

  await wait(1e3)

  const result2 = await (await fetch('http://localhost:9910/counter')).text()

  t.is(result2, '2')

  const result3 = await (await fetch('http://localhost:9910/hello')).text()

  t.is(result3, '2')

  await wait(10e3)

  t.is(Object.keys(server.functions.observables).length, 0)

  server.destroy()
})

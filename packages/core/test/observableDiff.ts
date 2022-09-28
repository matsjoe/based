import test from 'ava'
import { BasedCoreClient } from '../src/index'
import createServer from '@based/server'
import { wait } from '@saulx/utils'

test.serial('observablesDiff', async (t) => {
  const coreClient = new BasedCoreClient()

  const obsStore = {
    counter: async (payload, update) => {
      const largeThing: any = { bla: [] }
      for (let i = 0; i < 10; i++) {
        largeThing.bla.push({
          title: 'snurp',
          cnt: i,
          snurp: ~~(Math.random() * 19999),
        })
      }
      update(largeThing)
      const counter = setInterval(() => {
        largeThing.bla[~~(Math.random() * largeThing.bla.length - 1)].snup = ~~(
          Math.random() * 19999
        )
        // diff has to be made on an extra cache layer
        update(largeThing)
      }, 100)
      return () => {
        clearInterval(counter)
      }
    },
  }

  const server = await createServer({
    port: 9910,
    functions: {
      memCacheTimeout: 5e3,
      idleTimeout: 1e3,
      // add some defaults here...
      route: ({ name }) => {
        if (name && obsStore[name]) {
          return { name, observable: true }
        }
        return false
      },
      uninstall: async (opts) => {
        console.info('unRegister', opts.name)
        return true
      },
      install: async ({ name }) => {
        if (obsStore[name]) {
          return {
            observable: true,
            name,
            checksum: 1,
            function: obsStore[name],
          }
        } else {
          return false
        }
      },
      log: () => {},
    },
  })

  coreClient.connect({
    url: async () => {
      return 'ws://localhost:9910'
    },
  })

  coreClient.once('connect', (isConnected) => {
    console.info('connect', isConnected)
  })

  coreClient.on('debug', (d) => {
    // make this nice
    // @ts-ignore
    console.info(d.data)
  })

  const results: any[] = []

  const close = coreClient.observe(
    'counter',
    (d, c) => {
      console.info('\nincoming', c)
      results.push(d)
    },
    {
      myQuery: 123,
    }
  )

  await wait(3e3)

  coreClient.disconnect()

  await wait(3e3)

  console.info('------------------>')
  coreClient.connect({
    url: async () => {
      return 'ws://localhost:9910'
    },
  })

  await wait(1e3)

  console.info('hekllo')
  coreClient.cache.clear()

  await wait(5e3)

  console.info('close it now')
  close()

  await wait(6e3)

  t.is(Object.keys(server.activeObservables).length, 0)
  t.is(server.activeObservablesById.size, 0)

  await wait(6e3)
  t.is(Object.keys(server.functions.observables).length, 0)
})

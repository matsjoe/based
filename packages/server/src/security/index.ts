// rate limit
import { request } from 'https'
import type { BasedServer } from '../server'
// import { BasedErrorCode } from '../error'
// import { HttpClient, isHttpClient, WebsocketClient } from '../types'

// token

const drainRequestCounter = (server: BasedServer) => {
  server.requestsCounterInProgress = true
  server.requestsCounterTimeout = setTimeout(() => {
    server.requestsCounterInProgress = false

    // every 30 second remove  - 30 reqs

    server.requestsCounter.forEach((value, ip) => {
      if (!value.errors?.size) {
        if (value.requests <= 0) {
          server.requestsCounter.delete(ip)
          return
          // check if client is still active ?
        }
      } else {
        console.info('error handle different')
      }
      console.info('DRAIN TIME')
      value.requests -= 60
    })

    if (server.requestsCounter.size) {
      drainRequestCounter(server)
    }
  }, 30e3)
}

export const incomingCounter = (server: BasedServer, ip: string): boolean => {
  let ipReqCounter = server.requestsCounter.get(ip)
  if (!ipReqCounter) {
    ipReqCounter = {
      requests: 1,
    }
    server.requestsCounter.set(ip, ipReqCounter)
  } else {
    ipReqCounter.requests++
  }

  // rate limit per route....
  if (ipReqCounter.requests > 1000) {
    // console.info('RATE  LIMIT', ip)
    // good indicator of malicious activity
    // server.emit('ratelimit', client)
    return true
  }

  if (!server.requestsCounterInProgress) {
    drainRequestCounter(server)
  }

  return false
}

// incoming error counter is also a thing

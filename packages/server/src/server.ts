import uws from '@based/uws'
import initNetwork from './network'
import type {
  ServerOptions,
  ActiveObservable,
  Listener,
  EventMap,
  Event,
  HttpClient,
  WebsocketClient,
} from './types'
import { BasedFunctions } from './functions'
import { BasedAuth } from './auth'

// extend emitter
export class BasedServer {
  public functions: BasedFunctions

  public auth: BasedAuth

  public port: number

  public uwsApp: uws.TemplatedApp

  public listenSocket: any

  public blocked: Set<string> = new Set()

  // in bytes
  public cacheSize: number = 0

  public activeObservables: {
    [name: string]: Map<number, ActiveObservable>
  } = {}

  public activeObservablesById: Map<number, ActiveObservable> = new Map()

  public listeners: {
    [E in Event]?: Listener<EventMap[E]>[]
  } = {}

  constructor(opts: ServerOptions) {
    this.functions = new BasedFunctions(this, opts.functions)
    this.auth = new BasedAuth(this, opts.auth)
    initNetwork(this, opts)
  }

  emit(
    type: Event,
    client: HttpClient | WebsocketClient,
    val: EventMap[Event]
  ) {
    if (this.listeners[type]) {
      this.listeners[type].forEach((fn) => fn(client, val))
    }
  }

  on(type: Event, fn: Listener<EventMap[Event]>) {
    if (!this.listeners[type]) {
      this.listeners[type] = []
    }
    this.listeners[type].push(fn)
  }

  removeAllListeners() {
    this.listeners = {}
  }

  once(type: Event, fn: Listener<EventMap[Event]>) {
    this.on(type, (v) => {
      fn(v)
      this.off(type, fn)
    })
  }

  off(type: Event, fn: Listener<EventMap[Event]>) {
    const listeners = this.listeners[type]
    if (listeners) {
      if (!fn) {
        delete this.listeners[type]
      } else {
        for (let i = 0, len = listeners.length; i < len; i++) {
          if (listeners[i] === fn) {
            listeners.splice(i, 1)
            break
          }
        }
        if (listeners.length === 0) {
          delete this.listeners[type]
        }
      }
    }
  }

  start(port?: number): Promise<BasedServer> {
    if (!port) {
      port = this.port
    } else {
      this.port = port
    }
    return new Promise((resolve, reject) => {
      this.uwsApp.listen(this.port, (listenSocket) => {
        if (listenSocket) {
          console.info('💫  Based-server v2 listening on port:', this.port)
          // do this better wrap a nice thing arround it
          this.listenSocket = listenSocket
          resolve(this)
        } else {
          console.info('🤮  Based-server v2 error on port:', this.port)
          reject(new Error('Cannot start based-server on port: ' + this.port))
        }
      })
    })
  }

  async destroy() {
    console.info('🔥 Based-server v2 Destroy based-server')
    if (this.listenSocket) {
      uws.us_listen_socket_close(this.listenSocket)
      this.listenSocket = null
    }
    this.listenSocket = null
    this.uwsApp = null
  }
}

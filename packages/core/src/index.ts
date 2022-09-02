import {
  GenericObject,
  BasedOpts,
  CloseObserve,
  ObserveOpts,
  ObserveDataListener,
  ObserveErrorListener,
  AuthState,
  FunctionResponseListeners,
  Settings,
  FunctionQueue,
  ObserveState,
  ObserveQueue,
  Cache,
  GetObserveQueue,
} from './types'
import { GetState } from './types/observe'
import { Connection } from './websocket/types'
import connectWebsocket from './websocket'
import Emitter from './Emitter'
import getUrlFromOpts from './getUrlFromOpts'
import {
  addObsToQueue,
  addToFunctionQueue,
  addObsCloseToQueue,
  drainQueue,
  sendAuth,
  addGetToQueue,
} from './outgoing'
import { envId } from '@based/ids'
import { incoming } from './incoming'
import { genObserveId } from './genObserveId'

export class BasedCoreClient extends Emitter {
  constructor(opts?: BasedOpts, settings?: Settings) {
    super()
    if (settings) {
      for (const k in settings) {
        this[k] = settings[k]
      }
    }
    if (opts) {
      this.connect(opts)
    }
  }

  // --------- Connection State
  opts: BasedOpts
  envId: string
  connected: boolean = false
  connection: Connection
  url: string | (() => Promise<string>)
  // --------- Queue
  functionQueue: FunctionQueue = []
  observeQueue: ObserveQueue = new Map()
  getObserveQueue: GetObserveQueue = new Map()
  drainInProgress: boolean = false
  drainTimeout: ReturnType<typeof setTimeout>
  idlePing: ReturnType<typeof setTimeout>
  // --------- Cache State
  localStorage: boolean = false
  maxCacheSize: number = 4e6 // in bytes
  maxCacheTime: number = 2630e3 // in seconds (1 month default)
  cache: Cache = new Map()
  // --------- Function State
  functionResponseListeners: FunctionResponseListeners = new Map()
  requestId: number = 0 // max 3 bytes (0 to 16777215)
  // --------- Observe State
  observeState: ObserveState = new Map()
  // --------- Get State
  getState: GetState = new Map()
  // -------- Auth state
  authState: AuthState = { token: false }
  authRequestId: number
  authRequest: AuthState
  authInProgress: Promise<AuthState> // TODO: check if needed
  authResponseListeners: FunctionResponseListeners = new Map()
  // --------- Internal Events
  onClose() {
    this.connected = false
    this.emit('disconnect', true)
  }

  onReconnect() {
    this.connected = true

    // --------- Resend all subscriptions
    for (const [id, obs] of this.observeState) {
      if (!this.observeQueue.has(id)) {
        const cachedData = this.cache.get(id)
        addObsToQueue(
          this,
          obs.name,
          id,
          obs.payload,
          cachedData?.checksum || 0
        )
      }
    }

    this.emit('reconnect', true)
  }

  onOpen() {
    this.connected = true
    this.emit('connect', true)
    drainQueue(this)
  }

  onData(data: any) {
    incoming(this, data)
  }

  // --------- Connect
  public async connect(opts?: BasedOpts) {
    if (opts) {
      this.url = await getUrlFromOpts(opts)
      if (this.opts) {
        console.warn('replace client connect opts')
        this.disconnect()
      }
      this.opts = opts
      this.envId =
        opts.env && opts.org && opts.project
          ? envId(opts.env, opts.org, opts.project)
          : undefined
    }
    if (!this.opts) {
      console.error('Configure opts to connect')
      return
    }
    if (this.url && !this.connection) {
      this.connection = connectWebsocket(this, this.url)
    }
  }

  public disconnect() {
    if (this.connection) {
      this.connection.disconnected = true
      this.connection.destroy()
      if (this.connection.ws) {
        this.connection.ws.close()
      }
      if (this.connected) {
        this.onClose()
      }
      delete this.connection
    }
    this.connected = false
  }

  // --------- Observe
  observe(
    name: string,
    onData: ObserveDataListener,
    payload?: GenericObject,
    onError?: ObserveErrorListener,
    opts?: ObserveOpts
  ): CloseObserve {
    if (opts) {
      // cache options
      console.warn('observe opts not implemented yet...', opts)
    }
    const id = genObserveId(name, payload)
    let subscriberId: number
    const cachedData = this.cache.get(id)
    if (!this.observeState.has(id)) {
      subscriberId = 1
      const subscribers = new Map()
      subscribers.set(subscriberId, {
        onError,
        onData,
      })
      this.observeState.set(id, {
        payload,
        name,
        subscribers,
      })
      addObsToQueue(this, name, id, payload, cachedData?.checksum || 0)
    } else {
      const obs = this.observeState.get(id)
      subscriberId = obs.subscribers.size + 1
      obs.subscribers.set(subscriberId, {
        onError,
        onData,
      })
    }
    if (cachedData) {
      onData(cachedData.value, cachedData.checksum)
    }
    return () => {
      const obs = this.observeState.get(id)
      obs.subscribers.delete(subscriberId)
      if (obs.subscribers.size === 0) {
        this.observeState.delete(id)
        addObsCloseToQueue(this, name, id)
      }
    }
  }

  get(name: string, payload?: GenericObject, opts?: ObserveOpts): Promise<any> {
    if (opts) {
      // cache options
      console.warn('get opts not implemented yet...', opts)
    }

    return new Promise((resolve, reject) => {
      const id = genObserveId(name, payload)

      if (this.getState.has(id)) {
        this.getState.get(id).push([resolve, reject])
        return
      }

      this.getState.set(id, [])

      const cachedData = this.cache.get(id)

      if (this.observeState.has(id)) {
        if (this.observeQueue.has(id)) {
          const [type] = this.observeQueue.get(id)
          if (type === 1) {
            // add listener
            this.getState.get(id).push([resolve, reject])
            return
          }
        }
        if (cachedData) {
          resolve(cachedData.value)
          return
        }
      }

      this.getState.get(id).push([resolve, reject])
      addGetToQueue(this, name, id, payload, cachedData?.checksum || 0)
    })
  }

  // -------- Function
  function(name: string, payload?: GenericObject): Promise<any> {
    return new Promise((resolve, reject) => {
      addToFunctionQueue(this, payload, name, resolve, reject)
    })
  }

  // -------- Auth
  // maybe only send token on connect / upgrade
  async auth(token: string | false): Promise<any> {
    return new Promise((resolve, reject) => {
      if (token === false) {
        this.authState = { token: false }
        this.emit('auth', this.authState)
        resolve(true)
        sendAuth(this, { token: false }, resolve, reject)
      } else if (typeof token === 'string') {
        // this.authInProgress = true

        sendAuth(this, { token }, resolve, reject)
      }
    })
  }
}

export { BasedOpts }

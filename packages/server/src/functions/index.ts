import type { BasedServer } from '../server'
import {
  BasedFunctionSpec,
  BasedObservableFunctionSpec,
  FunctionConfig,
  isObservableFunctionSpec,
} from '../types'
import { deepMerge } from '@saulx/utils'
import { fnIsTimedOut, updateTimeoutCounter } from './timeout'

export { isObservableFunctionSpec }

export class BasedFunctions {
  server: BasedServer

  config: FunctionConfig

  unRegisterTimeout: NodeJS.Timeout

  observables: {
    [key: string]: BasedObservableFunctionSpec
  } = {}

  functions: {
    [key: string]: BasedFunctionSpec
  } = {}

  constructor(server: BasedServer, config?: FunctionConfig) {
    this.server = server
    if (config) {
      this.updateConfig(config)
    }
  }

  unRegisterLoop() {
    this.unRegisterTimeout = setTimeout(async () => {
      const q = []
      for (const name in this.functions) {
        const spec = this.functions[name]
        if (fnIsTimedOut(spec)) {
          q.push(this.unRegister(name, spec))
        }
      }
      for (const name in this.observables) {
        const spec = this.observables[name]
        if (this.server.activeObservables[name]) {
          updateTimeoutCounter(spec, this.config.idleTimeout)
        } else if (fnIsTimedOut(spec)) {
          q.push(this.unRegister(name, spec))
        }
      }
      await Promise.all(q)
      this.unRegisterLoop()
    }, 3e3)
  }

  updateConfig(config: FunctionConfig) {
    if (this.config) {
      deepMerge(this.config, config)
    } else {
      this.config = config
    }
    if (this.config.idleTimeout === undefined) {
      this.config.idleTimeout = 20e3 // 1 min
    }
    if (this.config.memCacheTimeout === undefined) {
      this.config.memCacheTimeout = 3e3
    }
    if (this.config.maxWorkers === undefined) {
      this.config.maxWorkers = 0
    }
    if (this.config.log === undefined) {
      this.config.log = (opts) => {
        console.info(opts)
      }
    }
    if (this.unRegisterTimeout) {
      clearTimeout(this.unRegisterTimeout)
    }
    this.unRegisterLoop()
  }

  async get(
    name: string
  ): Promise<BasedObservableFunctionSpec | BasedFunctionSpec | false> {
    const spec = this.getFromStore(name)
    if (spec) {
      return spec
    }
    if (
      await this.config.register({
        server: this.server,
        name,
      })
    ) {
      return this.getFromStore(name)
    }
    return false
  }

  getFromStore(
    name: string
  ): BasedObservableFunctionSpec | BasedFunctionSpec | false {
    const spec = this.observables[name] || this.functions[name]
    if (spec) {
      updateTimeoutCounter(spec, this.config.idleTimeout)
      return spec
    }
    return false
  }

  async update(
    spec: BasedObservableFunctionSpec | BasedFunctionSpec
  ): Promise<boolean> {
    if (spec) {
      if (spec.timeoutCounter === undefined) {
        const idleTimeout = spec.idleTimeout || this.config.idleTimeout
        spec.timeoutCounter = idleTimeout === 0 ? -1 : idleTimeout
      }
      if (isObservableFunctionSpec(spec)) {
        if (this.functions[spec.name]) {
          this.remove(spec.name)
        }
        this.observables[spec.name] = spec
        if (this.server.activeObservables[spec.name]) {
          for (const id in this.server.activeObservables[spec.name]) {
            this.server.activeObservables[spec.name][id].updateObservableCode()
          }
        }
      } else {
        if (this.observables[spec.name]) {
          this.remove(spec.name)
        }
        this.functions[spec.name] = spec
      }
    }
    return false
  }

  async unRegister(
    name: string,
    spec?: BasedObservableFunctionSpec | BasedFunctionSpec | false
  ): Promise<boolean> {
    if (!spec && spec !== false) {
      spec = this.getFromStore(name)
    }
    if (spec) {
      if (
        await this.config.unRegister({
          server: this.server,
          function: spec,
          name,
        })
      ) {
        return this.remove(name)
      }
    }
    return false
  }

  remove(name: string): boolean {
    // Does not call unregister!
    if (this.observables[name]) {
      delete this.observables[name]
      const active = this.server.activeObservables[name]
      if (active) {
        for (const id in active) {
          active[id].destroy()
        }
        delete this.server.activeObservables[name]
      }
    } else if (this.functions[name]) {
      delete this.functions[name]
      return true
    }
    return false
  }
}
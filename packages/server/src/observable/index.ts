import { BasedServer } from '..'

export class BasedObservableFunction {
  server: BasedServer
  name: string
  id: number

  constructor(server: BasedServer, name: string, id: number) {
    this.server = server
    if (!this.server.activeObservables[name]) {
      this.server.activeObservables[name] = {}
    }

    if (this.server.activeObservables[name][id]) {
      console.error('OBSERVABLE ALLRDY EXISTS', id, name)
    } else {
      this.server.activeObservables[name][id] = this
    }
  }

  destroy() {
    console.info('destroy observable!')
    // also need to send info to clients that its gone (e.g. does not exist anymore)
    if (this.server.activeObservables[this.name]?.[this.id]) {
      delete this.server.activeObservables[this.name][this.id]
    }
  }

  async updateObservableCode(): Promise<void> {
    console.info('update observable code!', this.id, this.name)
  }
}

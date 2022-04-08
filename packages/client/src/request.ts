import { BasedClient } from '.'
import { addToQueue } from './queue'
import { RequestData, RequestTypes } from '@based/types'
import createError from './createError'

let requestIdCnt = 0

export const addRequest = (
  client: BasedClient,
  type:
    | RequestTypes.Set
    | RequestTypes.Get
    | RequestTypes.Configuration
    | RequestTypes.GetConfiguration
    | RequestTypes.Delete
    | RequestTypes.Copy
    | RequestTypes.Digest
    | RequestTypes.Call,
  payload: any,
  resolve: (val?: any) => void,
  reject: (err: Error) => void,
  name?: string
) => {
  const id = ++requestIdCnt
  client.requestCallbacks[id] = {
    resolve,
    reject,
  }

  if (type === RequestTypes.Call) {
    addToQueue(client, [type, name, id, payload])
  } else {
    addToQueue(client, [type, id, payload])
  }
}

export const abortRequest = () => {
  // if its still in queue remove from queue
}

export const cleanUpRequests = () => {
  // on re-connect and not in queue anymore - need to remove in that case
}

export const incomingRequest = (client: BasedClient, data: RequestData) => {
  const [, reqId, payload, err] = data

  const cb = client.requestCallbacks[reqId]
  if (cb) {
    delete client.requestCallbacks[reqId]
    if (err) {
      cb.reject(createError(err))
    } else {
      cb.resolve(payload)
    }
  }
}
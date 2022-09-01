import { BasedCoreClient } from '..'
import fflate from 'fflate'

export const decodeHeader = (
  nr: number
): { type: number; isDeflate: boolean; len: number } => {
  // 4 bytes
  // type (3 bits)
  //   0 = functionData
  //   1 = subscriptionData
  //   2 = subscriptionDiffData
  // isDeflate (1 bit)
  // len (28 bits)
  const len = nr >> 4
  const meta = nr & 15
  const type = meta >> 1
  const isDeflate = meta & 1
  return {
    type,
    isDeflate: isDeflate === 1,
    len,
  }
}

export const readUint8 = (
  buff: Uint8Array,
  start: number,
  len: number
): number => {
  let n = 0
  const s = len - 1 + start
  for (let i = s; i >= start; i--) {
    n = n * 256 + buff[i]
  }
  return n
}

const parseArrayBuffer = async (d: any): Promise<Uint8Array> => {
  if (typeof window === 'undefined') {
    if (d instanceof Buffer) {
      return new Uint8Array(d)
    }
  } else {
    if (d instanceof Blob) {
      const buffer = await d.arrayBuffer()
      return new Uint8Array(buffer)
    }
  }
  throw new Error('Recieved incorrect data')
}

export const incoming = async (client: BasedCoreClient, data) => {
  try {
    const d = data.data
    const buffer = await parseArrayBuffer(d)
    const { type, len, isDeflate } = decodeHeader(readUint8(buffer, 0, 4))
    // reader for batched replies

    // ------- Function
    if (type === 0) {
      // | 4 header | 3 id | * payload |
      const id = readUint8(buffer, 4, 3)
      const start = 7
      const end = len + 4
      let payload: any

      // if not empty response, parse it
      if (len - 3 !== 0) {
        payload = JSON.parse(
          new TextDecoder().decode(
            isDeflate
              ? fflate.inflateSync(buffer.slice(start, end))
              : buffer.slice(start, end)
          )
        )
      }

      if (client.functionResponseListeners.has(id)) {
        client.functionResponseListeners.get(id)[0](payload)
        client.functionResponseListeners.delete(id)
      }

      if (client.listeners.debug) {
        client.emit('debug', {
          direction: 'down',
          binary: data.data,
          data: { id, payload },
          type: 'function',
        })
      }
    }

    // ------- Get checksum is up to date
    if (type === 3) {
      // | 4 header | 8 id |
      const id = readUint8(buffer, 4, 8)
      if (client.getState.has(id) && client.cache.has(id)) {
        const get = client.getState.get(id)
        for (const [resolve] of get) {
          resolve(client.cache.get(id).value)
        }
        client.getState.delete(id)
      }

      if (client.listeners.debug) {
        client.emit('debug', {
          direction: 'down',
          binary: data.data,
          data: { id },
          type: 'get',
        })
      }
    }

    // ------- Subscription data
    if (type === 1) {
      // | 4 header | 8 id | 8 checksum | * payload |
      const id = readUint8(buffer, 4, 8)
      const checksum = readUint8(buffer, 12, 8)

      const start = 20
      const end = len + 4
      let payload: any

      // if not empty response, parse it
      if (len - 16 !== 0) {
        payload = JSON.parse(
          new TextDecoder().decode(
            isDeflate
              ? fflate.inflateSync(buffer.slice(start, end))
              : buffer.slice(start, end)
          )
        )
      }

      // handle max size etc / localstorage etc
      client.cache.set(id, {
        value: payload,
        checksum,
      })

      if (client.observeState.has(id)) {
        const observable = client.observeState.get(id)
        for (const [, handlers] of observable.subscribers) {
          handlers.onData(payload, checksum)
        }
      }

      if (client.getState.has(id)) {
        const get = client.getState.get(id)
        for (const [resolve] of get) {
          resolve(payload)
        }
        client.getState.delete(id)
      }

      if (client.listeners.debug) {
        client.emit('debug', {
          direction: 'down',
          binary: data.data,
          data: {
            name: client.observeState.get(id).name,
            query: client.observeState.get(id).payload,
            id,
            checksum,
            payload,
          },
          type: 'subscription',
        })
      }
    }

    // ---------------------------------
  } catch (err) {
    console.error('Error parsing incoming data', err)
  }
}

import uws from '@based/uws'
import { isObservableFunctionSpec } from '../../functions'
import { decodePayload, decodeName, readUint8 } from '../../protocol'
import { BasedServer } from '../../server'
import { create, unsubscribe, destroy, subscribe } from '../../observable'

const fail = (server: BasedServer, reqId: number) => {
  console.log('Handle sending error')
  destroy(server, reqId)
}

export const subscribeMessage = (
  arr: Uint8Array,
  start: number,
  len: number,
  isDeflate: boolean,
  ws: uws.WebSocket,
  server: BasedServer
) => {
  // | 4 header | 8 id | 8 checksum | 1 name length | * name | * payload |

  const nameLen = arr[start + 20]

  const id = readUint8(arr, start + 4, 8)
  const checksum = readUint8(arr, start + 12, 8)
  const name = decodeName(arr, start + 21, start + 21 + nameLen)

  if (!name || !id) {
    return false
  }

  if (ws.obs.has(id)) {
    // allready subscribed to this id
    return true
  }

  const payload = decodePayload(
    new Uint8Array(arr.slice(start + 21 + nameLen, start + len)),
    isDeflate
  )

  server.auth.config
    .authorizeAdvanced(server, ws, 'observe', name, payload)
    .then((ok) => {
      if (!ok) {
        fail(server, id)
        return false
      }

      ws.subscribe(String(id))
      ws.obs.add(id)

      if (server.activeObservablesById.has(id)) {
        subscribe(server, id, checksum, ws)
      } else {
        server.functions
          .get(name)
          .then((spec) => {
            if (spec && isObservableFunctionSpec(spec)) {
              const obs = create(server, name, id, payload)
              if (!ws.obs.has(id)) {
                if (obs.clients.size === 0) {
                  destroy(server, id)
                }
              } else {
                subscribe(server, id, checksum, ws)
              }
            } else {
              console.error('No function for you', name)
            }
          })
          .catch((err) => {
            console.error('fn does not exist', err)
          })
      }
    })
    .catch((err) => {
      console.log({ err })
      destroy(server, id)
    })

  return true
}

export const unsubscribeMessage = (
  arr: Uint8Array,
  start: number,
  ws: uws.WebSocket,
  server: BasedServer
) => {
  // | 4 header | 8 id |

  const id = readUint8(arr, start + 4, 8)

  if (!id) {
    return false
  }

  ws.unsubscribe(String(id))

  unsubscribe(server, id, ws)

  return true
}

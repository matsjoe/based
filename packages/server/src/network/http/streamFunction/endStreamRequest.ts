import { HttpClient } from '../../../types'
import end from '../end'

export default (client: HttpClient) => {
  // size?
  // request id
  // bit weird that when you upload you dont get an id etc but ok
  if (client.res) {
    client.res.cork(() => {
      client.res.writeStatus('200 OK')
      client.res.writeHeader('Access-Control-Allow-Origin', '*')
      client.res.writeHeader('Access-Control-Allow-Headers', 'content-type')
      client.res.writeHeader('Content-Type', 'application/json')
      end(client, '{}')
    })
  }
}
import { BasedServerClient } from '@based/server'

export default async ({
  payload,
  based,
  user,
}: {
  based: BasedServerClient
  payload?: any
  user?: any
}) => {
  const refreshToken = user?._refreshToken
  if (refreshToken) {
    based.redis.set(refreshToken, 'invalidated', 'EX', 60 * 60 * 24 * 7) // expire in 7d
  }
  return {}
}

import crypto from 'crypto'
import { Params } from '@based/server'
import fetch from 'node-fetch'

const tokenExpiresIn = '30m'
const refreshTokenExpiresIn = '7d'

// TODO: DRY
const generateTokens = async ({ based, id, privateKey }) => {
  const token = await based.encode(
    { sub: id, id },
    { key: privateKey },
    'jwt',
    { expiresIn: tokenExpiresIn }
  )
  const refreshToken = await based.encode(
    { sub: id, id, refreshToken: true },
    { key: privateKey },
    'jwt',
    { expiresIn: refreshTokenExpiresIn }
  )

  const code = crypto.randomBytes(16).toString('hex')
  based.redis.set(
    {
      name: 'default',
      type: 'origin',
    },
    code,
    JSON.stringify({
      token,
      tokenExpiresIn,
      refreshToken,
      refreshTokenExpiresIn,
    }),
    'EX',
    60 * 5
  ) // expire in 5m

  return { token, refreshToken, code }
}

export default async ({ based, payload }: Params) => {
  // TODO: Add validation
  const { code, redirect, state } = payload

  //rlet keys = JSON.parse(await based.secret('google-keys'))
  const { project, env } = based.opts
  const privateKey = await based.secret(`users-private-key-${project}-${env}`)
  const githubClientId = await based.secret('github-client-id')
  const githubClientSecret = await based.secret('github-client-secret')

  if (payload.getClientId === true) {
    return { clientId: githubClientId }
  }

  let accessTokenResponse: any
  try {
    accessTokenResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: githubClientId,
          client_secret: githubClientSecret,
          code,
          redirect_uri: redirect,
        }),
      }
    ).then((response) => response.json())

    if (accessTokenResponse.error) {
      throw new Error(accessTokenResponse.error)
    }
  } catch (error) {
    throw new Error(error)
  }
  const { access_token: accessToken } = accessTokenResponse
  if (!accessToken) throw new Error('Could not get access_token')

  let profileResponse: any
  try {
    profileResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: 'token ' + accessToken,
      },
    }).then((response) => response.json())

    if (profileResponse.error) {
      throw new Error(profileResponse.error)
    }
  } catch (error) {
    throw new Error('error decoding thirdparty')
  }
  const {
    id,
    name,
    // avatar: avatar_url
  } = profileResponse

  let emailsResponse: any
  try {
    emailsResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: 'token ' + accessToken,
      },
    }).then((response) => response.json())

    if (emailsResponse.error) {
      throw new Error(emailsResponse.error)
    }
  } catch (error) {
    throw new Error('error decoding thirdparty')
  }
  const email = emailsResponse.find(
    (e: { primary: boolean }) => e.primary === true
  )?.email
  if (!email) throw new Error('Could not fetch email')

  const alias = 'github-' + id

  const { existingUser } = await based.get({
    existingUser: {
      id: true,
      email: true,
      name: true,
      aliases: true,
      $find: {
        $traverse: 'children',
        $filter: [
          {
            $field: 'type',
            $operator: '=',
            $value: 'user',
          },
          {
            $operator: '=',
            $field: 'email',
            $value: email,
          },
        ],
      },
    },
  })

  if (!existingUser) {
    // it's a register
    const userWithGoogleId = await based.get({ $alias: alias, id: true })
    if (userWithGoogleId.id) {
      throw new Error('User already registered with another email')
    }

    const { id } = await based.set({
      type: 'user',
      $alias: alias,
      email,
      name,
      // TODO: add avatar?
      // avatar: photo
    })

    const { token, refreshToken, code } = await generateTokens({
      based,
      id,
      privateKey,
    })

    return {
      id,
      code,
      email,
      token,
      tokenExpiresIn,
      refreshToken,
      refreshTokenExpiresIn,
      state,
      newUser: true,
    }
  } else {
    // it's a signin
    if (!existingUser.aliases.includes(alias)) {
      throw new Error('Email and third party authenticator mismatch')
    }
    if (existingUser.id) {
      const { token, refreshToken, code } = await generateTokens({
        based,
        id: existingUser.id,
        privateKey,
      })

      return {
        id: existingUser.id,
        code,
        email,
        token,
        tokenExpiresIn,
        refreshToken,
        refreshTokenExpiresIn,
        state,
      }
    }

    throw new Error('user not found')
  }
}

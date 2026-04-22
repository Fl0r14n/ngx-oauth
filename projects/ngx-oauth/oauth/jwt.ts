import { effect, InjectionToken } from '@angular/core'
import { config, strictJwt } from './config'
import { OpenIdConfig } from './types'
import { createRemoteJWKSet, jwtVerify } from 'jose'

const jwt = (idToken?: string) => {
  const payload = idToken?.split('.')[1]
  return payload
    ? JSON.parse(
        decodeURIComponent(
          Array.from(atob(payload))
            .map(c => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
            .join('')
        )
      )
    : {}
}

let jwksSet: ReturnType<typeof createRemoteJWKSet> | undefined

const verifyJwt = async (idToken?: string) => {
  if (!idToken) return {}
  if (!jwksSet) return jwt(idToken)
  const { issuerPath, clientId } = (config() as OpenIdConfig) || {}
  try {
    const { payload } = await jwtVerify(idToken, jwksSet, {
      ...(issuerPath && { issuer: issuerPath }),
      ...(clientId && { audience: clientId })
    })
    return payload
  } catch {
    return { error: 'Invalid token' }
  }
}

export const OAUTH_VERIFY_JWT = new InjectionToken('OAUTH_VERIFY_JWT', {
  providedIn: 'root',
  factory: () => {
    effect(() => {
      const jwksUri = (config() as OpenIdConfig)?.jwksUri
      jwksSet = jwksUri && strictJwt() ? createRemoteJWKSet(new URL(jwksUri)) : undefined
    })
    return verifyJwt
  }
})

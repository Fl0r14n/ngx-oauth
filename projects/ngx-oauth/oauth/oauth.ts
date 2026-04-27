import {
  AuthorizationCodeParameters,
  ClientCredentialConfig,
  OAuthParameters,
  OAuthType,
  OpenIdConfig,
  ResourceOwnerConfig,
  ResourceOwnerParameters
} from './types'
import { OAUTH_TOKEN } from './token'
import { config } from './config'
import { inject, InjectionToken, signal } from '@angular/core'
import { OAUTH_AUTHORIZE, OAUTH_CLIENT_CREDENTIAL, OAUTH_RESOURCE_OWNER, OAUTH_REVOKE } from './functions'
import { OAUTH_VERIFY_JWT } from './jwt'

const arrToString = (buf: Uint8Array) => buf.reduce((s, b) => s + String.fromCharCode(b), '')
const base64url = (str: string) => btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
const randomString = (length = 48) => {
  const buff = arrToString(crypto.getRandomValues(new Uint8Array(length * 2)))
  return base64url(buff).substring(0, length)
}
const pkce = async (value: string) => {
  const buff = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return base64url(arrToString(new Uint8Array(buff)))
}
const parseOauthUri = (hash: string) => {
  const params = Object.fromEntries(new URLSearchParams(hash))
  return (Object.keys(params).length && params) || {}
}

export const OAUTH = new InjectionToken('OAUTH', {
  providedIn: 'root',
  factory: () => {
    const { token, status, type, isAuthorized, storageKey, autoconfigOauth } = inject(OAUTH_TOKEN)
    const resourceOwnerLogin = inject(OAUTH_RESOURCE_OWNER)
    const clientCredentialLogin = inject(OAUTH_CLIENT_CREDENTIAL)
    const revoke = inject(OAUTH_REVOKE)
    const authorize = inject(OAUTH_AUTHORIZE)
    const verifyJwt = inject(OAUTH_VERIFY_JWT)
    const state = signal<string | undefined>(undefined)

    const login = async (parameters?: OAuthParameters) => {
      await autoconfigOauth()
      if (!!parameters && (parameters as ResourceOwnerParameters).password) {
        token.set((await resourceOwnerLogin(parameters as ResourceOwnerParameters, config() as ResourceOwnerConfig)) || {})
      } else if (
        !!parameters &&
        (parameters as AuthorizationCodeParameters).redirectUri &&
        (parameters as AuthorizationCodeParameters).responseType
      ) {
        await toAuthorizationUrl(parameters as AuthorizationCodeParameters)
      } else {
        token.set((await clientCredentialLogin(config() as ClientCredentialConfig)) || {})
      }
    }

    const logout = async (logoutRedirectUri?: string, state?: string) => {
      await autoconfigOauth()
      const { logoutPath, clientId } = (config() as OpenIdConfig) || {}
      if (logoutRedirectUri && logoutPath) {
        const { id_token } = token()
        const tokenHint = (id_token && `&id_token_hint=${id_token}`) || ''
        const stateFwd = (state && `&state=${state}`) || ''
        const logoutUrl = `${logoutPath}?client_id=${clientId}&post_logout_redirect_uri=${logoutRedirectUri}${tokenHint}${stateFwd}`
        token.set({})
        globalThis.location?.replace(logoutUrl)
      } else {
        await revoke(token(), config())
        token.set({})
      }
    }

    const oauthCallback = async (url?: string | URL) => {
      const checkNonce = async (parameters: Record<string, string>) => {
        if (parameters['error']) return parameters
        const payload = await verifyJwt(parameters['id_token'])
        if (payload?.error || payload?.nonce !== token()?.nonce) {
          return { error: (payload?.error as string) || 'Invalid nonce' }
        }
        return parameters
      }
      const checkCode = async () => {
        const parameters = await authorize(token(), config())
        if (parameters) {
          token.set(await checkNonce(parameters))
        }
      }
      const path = (url && new URL(url)) || globalThis.location || {}
      const { hash, search } = path
      const isImplicitRedirect = hash && /(access_token=)|(error=)/.test(hash)
      const isAuthCodeRedirect = (search && /(code=)|(error=)/.test(search)) || (hash && /(code=)|(error=)/.test(hash))
      if (isImplicitRedirect) {
        const parameters = parseOauthUri(hash.substring(1))
        token.set({
          ...(await checkNonce(parameters)),
          type: OAuthType.IMPLICIT
        })
        state.set(parameters?.['state'])
      } else if (isAuthCodeRedirect) {
        const parameters = parseOauthUri(search?.substring(1) || hash?.substring(1))
        token.set({
          ...token(),
          ...parameters
          // do not set type yet. will be set by authorize function since it is a two-step process
        })
        state.set(parameters?.['state'])
        await autoconfigOauth()
        await checkCode()
      }
    }

    const toAuthorizationUrl = async (parameters: AuthorizationCodeParameters) => {
      const { authorizePath, clientId, scope = '', pkce } = config() as any
      let authorizationUrl = `${authorizePath}`
      authorizationUrl += (authorizePath.includes('?') && '&') || '?'
      authorizationUrl += `client_id=${clientId}`
      token.set({ ...token(), redirect_uri: parameters.redirectUri })
      authorizationUrl += `&access_type=${parameters.accessType || 'offline'}`
      authorizationUrl += `&prompt=${parameters.prompt || ''}`
      authorizationUrl += `&redirect_uri=${encodeURIComponent(parameters.redirectUri)}`
      authorizationUrl += `&response_type=${parameters.responseType}`
      authorizationUrl += `&scope=${encodeURIComponent(scope)}`
      authorizationUrl += `&state=${encodeURIComponent(parameters.state || '')}`
      authorizationUrl = `${authorizationUrl}${generateNonce(scope)}${await generateCodeChallenge(pkce)}`
      return globalThis.location?.replace(authorizationUrl)
    }

    const generateNonce = (scope: string) => {
      if (scope.indexOf('openid') > -1) {
        const nonce = randomString()
        token.set({ ...token(), nonce })
        return `&nonce=${nonce}`
      }
      return ''
    }

    const generateCodeChallenge = async (doPkce: any) => {
      if (doPkce) {
        const code_verifier = randomString()
        token.set({ ...token(), code_verifier })
        return `&code_challenge=${await pkce(code_verifier)}&code_challenge_method=S256`
      }
      return ''
    }

    return {
      login,
      logout,
      oauthCallback,
      state,
      token,
      status,
      type,
      isAuthorized,
      config,
      storageKey
    }
  }
})

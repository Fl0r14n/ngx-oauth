import { InjectionToken } from '@angular/core'
import { ClientCredentialConfig, OAuthToken, OAuthType, OpenIdConfig, ResourceOwnerConfig, ResourceOwnerParameters } from './types'

const HEADERS = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }

const refresh = async (token?: OAuthToken, config?: OpenIdConfig) => {
  const { tokenPath, clientId, clientSecret, scope } = config || {}
  const { refresh_token, type } = token || {}
  if (!refresh_token || !tokenPath) return token
  const result = await fetch(tokenPath, {
    method: 'POST',
    headers: HEADERS,
    body: new URLSearchParams({
      client_id: clientId!,
      ...((clientSecret && { client_secret: clientSecret }) || {}),
      grant_type: 'refresh_token',
      refresh_token,
      ...((scope && { scope }) || {})
    })
  }).then(r => r.json())
  return result ? { ...result, type } : token
}

const revoke = async (token?: OAuthToken, config?: OpenIdConfig) => {
  const { revokePath, clientId, clientSecret } = config || {}
  if (!revokePath) return
  const { access_token, refresh_token } = token || {}
  const base = {
    ...((clientId && { client_id: clientId }) || {}),
    ...((clientSecret && { client_secret: clientSecret }) || {})
  }
  if (access_token) {
    await fetch(revokePath, {
      method: 'POST',
      headers: HEADERS,
      body: new URLSearchParams({ ...base, token: access_token, token_type_hint: 'access_token' })
    })
  }
  if (refresh_token) {
    await fetch(revokePath, {
      method: 'POST',
      headers: HEADERS,
      body: new URLSearchParams({ ...base, token: refresh_token, token_type_hint: 'refresh_token' })
    })
  }
}

const authorize = async (token?: OAuthToken, config?: OpenIdConfig) => {
  const { clientId, clientSecret, tokenPath, scope } = config || {}
  const { code, redirect_uri, code_verifier } = token || {}
  if (!code || !tokenPath) return token
  const result = await fetch(tokenPath, {
    method: 'POST',
    headers: HEADERS,
    body: new URLSearchParams({
      code,
      client_id: clientId!,
      ...((clientSecret && { client_secret: clientSecret }) || {}),
      redirect_uri: redirect_uri!,
      grant_type: 'authorization_code',
      ...((scope && { scope }) || {}),
      ...((code_verifier && { code_verifier }) || {})
    })
  }).then(r => r.json())
  return result ? { ...result, type: OAuthType.AUTHORIZATION_CODE } : token
}

const clientCredentialLogin = async (config?: ClientCredentialConfig) => {
  const { clientId, clientSecret, tokenPath, scope } = config || {}
  if (!tokenPath) return undefined
  const result = await fetch(tokenPath, {
    method: 'POST',
    headers: HEADERS,
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      grant_type: OAuthType.CLIENT_CREDENTIAL,
      ...(scope ? { scope } : {})
    })
  }).then(r => r.json())
  return result ? { ...result, type: OAuthType.CLIENT_CREDENTIAL } : undefined
}

const resourceOwnerLogin = async (parameters?: ResourceOwnerParameters, config?: ResourceOwnerConfig) => {
  const { clientId, clientSecret, tokenPath, scope } = config || {}
  const { username, password } = parameters || {}
  if (!tokenPath || !clientId) return undefined
  const result = await fetch(tokenPath, {
    method: 'POST',
    headers: HEADERS,
    body: new URLSearchParams({
      client_id: clientId,
      ...((clientSecret && { client_secret: clientSecret }) || {}),
      grant_type: OAuthType.RESOURCE,
      ...((scope && { scope }) || {}),
      username: username!,
      password: password!
    })
  }).then(r => r.json())
  return result ? { ...result, type: OAuthType.RESOURCE } : undefined
}

const openIdConfiguration = async (config?: OpenIdConfig) => {
  const { issuerPath, clientId } = config || {}
  if (!issuerPath) return undefined
  return fetch(`${issuerPath}/.well-known/openid-configuration?client_id=${clientId}`).then(r => r.json())
}

const userInfo = async (config?: OpenIdConfig, fetchFn = fetch) => {
  const { userPath } = config || {}
  if (!userPath) return undefined
  return fetchFn(userPath).then(r => r.json())
}

const introspect = async (token?: OAuthToken, config?: OpenIdConfig) => {
  const { introspectionPath, clientId, clientSecret } = config || {}
  const { access_token } = token || {}
  if (!introspectionPath || !access_token || !clientId) return undefined
  return fetch(introspectionPath, {
    method: 'POST',
    headers: { ...HEADERS, Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}` },
    body: new URLSearchParams({ token: access_token })
  }).then(r => r.json())
}

export const OAUTH_REFRESH = new InjectionToken('OAUTH_REFRESH', {
  providedIn: 'root',
  factory: () => refresh
})

export const OAUTH_REVOKE = new InjectionToken('OAUTH_REVOKE', {
  providedIn: 'root',
  factory: () => revoke
})

export const OAUTH_AUTHORIZE = new InjectionToken('OAUTH_AUTHORIZE', {
  providedIn: 'root',
  factory: () => authorize
})

export const OAUTH_CLIENT_CREDENTIAL = new InjectionToken('OAUTH_CLIENT_CREDENTIAL', {
  providedIn: 'root',
  factory: () => clientCredentialLogin
})

export const OAUTH_RESOURCE_OWNER = new InjectionToken('OAUTH_RESOURCE_OWNER', {
  providedIn: 'root',
  factory: () => resourceOwnerLogin
})

export const OAUTH_OPENID_CONFIG = new InjectionToken('OAUTH_OPENID_CONFIG', {
  providedIn: 'root',
  factory: () => openIdConfiguration
})

export const OAUTH_USER_INFO = new InjectionToken('OAUTH_USER_INFO', {
  providedIn: 'root',
  factory: () => userInfo
})

export const OAUTH_INTROSPECT = new InjectionToken('OAUTH_INTROSPECT', {
  providedIn: 'root',
  factory: () => introspect
})

import { storageSignal } from './storage'
import { oauthConfig } from './config'
import { OAuthStatus, OAuthToken } from './types'
import { computed, linkedSignal } from '@angular/core'

export const storageKey = linkedSignal(() => oauthConfig().storageKey as string)
export const token = storageSignal<OAuthToken>(storageKey, {})

export const isExpiredToken = (token?: OAuthToken) => (token?.expires && Date.now() > token.expires) || false

export const type = computed(() => token().type)

export const accessToken = computed(() => {
  const { token_type, access_token } = token() || {}
  return (token_type && access_token && `${token_type} ${access_token}`) || undefined
})

export const status = computed(() => {
  const { value } = token()
  return (
    (value?.error && OAuthStatus.DENIED) ||
    (value?.access_token && !isExpiredToken(value) && OAuthStatus.AUTHORIZED) ||
    OAuthStatus.NOT_AUTHORIZED
  )
})

export const isAuthorized = computed(() => status() === OAuthStatus.AUTHORIZED)

export const error = computed(() => token().error)

export const hasError = computed(() => !!error())

export const errorDescription = computed(() => token().error_description)

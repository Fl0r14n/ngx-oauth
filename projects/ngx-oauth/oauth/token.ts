import { storageSignal } from './storage'
import { config, oauthConfig } from './config'
import { OAuthStatus, OAuthToken, OpenIdConfig } from './types'
import { computed, effect, inject, InjectionToken, linkedSignal, untracked } from '@angular/core'
import { OAUTH_REFRESH } from './functions'

const isExpiredToken = (token?: OAuthToken) => (token?.expires && Date.now() > token.expires) || false

export const OAUTH_TOKEN = new InjectionToken('OAUTH_TOKEN', {
  providedIn: 'root',
  factory: () => {
    const refresh = inject(OAUTH_REFRESH)
    const storageKey = linkedSignal(() => oauthConfig().storageKey as string)
    const token = storageSignal<OAuthToken>(storageKey, {})
    const type = computed(() => token().type)
    const accessToken = computed(() => {
      const { token_type, access_token } = token() || {}
      return (token_type && access_token && `${token_type} ${access_token}`) || undefined
    })
    const status = computed(() => {
      const { error, access_token } = token()
      return (
        (error && OAuthStatus.DENIED) || (access_token && !isExpiredToken(token()) && OAuthStatus.AUTHORIZED) || OAuthStatus.NOT_AUTHORIZED
      )
    })
    const isAuthorized = computed(() => status() === OAuthStatus.AUTHORIZED)
    const error = computed(() => token().error)
    const hasError = computed(() => !!error())
    const errorDescription = computed(() => token().error_description)

    effect(async () => {
      const t = token()
      const expiresIn = Number(t?.expires_in) || 0
      if (expiresIn) {
        if (!t.expires) {
          token.set({
            ...t,
            expires: Date.now() + expiresIn * 1000
          })
        } else if (isExpiredToken(t)) {
          const refreshed = await untracked(() => refresh(token(), config() as OpenIdConfig))
          token.set({ ...refreshed })
        }
      }
    })

    return {
      token,
      isExpiredToken,
      type,
      accessToken,
      status,
      isAuthorized,
      error,
      hasError,
      errorDescription
    }
  }
})

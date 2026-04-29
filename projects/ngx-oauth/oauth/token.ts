import { storageSignal } from './storage'
import { config, oauthConfig } from './config'
import { OAuthStatus, OAuthToken, OpenIdConfig } from './types'
import { computed, effect, inject, InjectionToken, linkedSignal, untracked } from '@angular/core'
import { OAUTH_OPENID_CONFIG, OAUTH_REFRESH } from './functions'

const isExpiredToken = (token?: OAuthToken) => (token?.expires && Date.now() > token.expires) || false

export const OAUTH_TOKEN = new InjectionToken('OAUTH_TOKEN', {
  providedIn: 'root',
  factory: () => {
    const refresh = inject(OAUTH_REFRESH)
    const openIdConfiguration = inject(OAUTH_OPENID_CONFIG)
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

    const autoconfigOauth = async () => {
      const c = config() as OpenIdConfig
      if (!(c.tokenPath || c.authorizePath)) {
        const v = await openIdConfiguration(c)
        if (v) {
          config.set({
            ...c,
            ...((v?.authorization_endpoint && { authorizePath: v.authorization_endpoint }) || {}),
            ...((v?.token_endpoint && { tokenPath: v.token_endpoint }) || {}),
            ...((v?.revocation_endpoint && { revokePath: v.revocation_endpoint }) || {}),
            ...((v?.userinfo_endpoint && { userPath: v.userinfo_endpoint }) || {}),
            ...((v?.introspection_endpoint && { introspectionPath: v.introspection_endpoint }) || {}),
            ...((v?.end_session_endpoint && { logoutPath: v.end_session_endpoint }) || {}),
            ...((v?.jwks_uri && { jwksUri: v.jwks_uri }) || {}),
            ...((c?.pkce === undefined &&
              v?.code_challenge_methods_supported && { pkce: v.code_challenge_methods_supported.indexOf('S256') > -1 }) ||
              {}),
            ...{ scope: c.scope || 'openid' }
          })
        }
      }
    }

    const setExpires = (t: OAuthToken) => {
      const expiresIn = Number(t?.expires_in) || 0
      if (expiresIn && !t.expires) {
        token.set({
          ...t,
          expires: Date.now() + expiresIn * 1000
        })
      }
    }

    let inFlight: Promise<void> | undefined
    const checkToken = (t: OAuthToken) => {
      if (inFlight) return inFlight
      inFlight = (async () => {
        if (isExpiredToken(t)) {
          await autoconfigOauth()
          const refreshed = await refresh(t, config())
          if (refreshed && !isExpiredToken(refreshed)) {
            //keep the refresh token cuz we might not net a new one
            setExpires({ refresh_token: t.refresh_token, ...refreshed })
          }
        } else {
          setExpires(t)
        }
      })().finally(() => (inFlight = undefined))
      return inFlight
    }

    effect(async () => {
      const t = token()
      await untracked(() => checkToken(t))
    })

    return {
      token,
      type,
      accessToken,
      status,
      isAuthorized,
      error,
      hasError,
      errorDescription,
      storageKey,
      checkToken,
      autoconfigOauth
    }
  }
})

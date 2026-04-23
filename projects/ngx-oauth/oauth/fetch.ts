import { computed, inject, InjectionToken } from '@angular/core'
import { OAUTH_TOKEN } from './token'
import { config, oauthConfig } from './config'
import { OAUTH_REFRESH } from './functions'

const getPath = (input: RequestInfo | URL): string =>
  input instanceof URL ? input.pathname : input instanceof Request ? new URL(input.url).pathname : input

const isPathIgnored = (input: RequestInfo | URL) => ignorePaths().some(pattern => pattern.test(getPath(input)))
const ignorePaths = computed(() => oauthConfig().ignorePaths as RegExp[])

export const OAUTH_FETCH = new InjectionToken<typeof fetch>('OAUTH_FETCH', {
  providedIn: 'root',
  factory: () => {
    const { token, accessToken, isExpiredToken } = inject(OAUTH_TOKEN)
    const refreshFn = inject(OAUTH_REFRESH)
    let inFlight: Promise<void> | undefined
    const refreshIfExpired = () => {
      if (inFlight) return inFlight
      if (!isExpiredToken(token())) return
      inFlight = refreshFn(token(), config() as any)
        .then(r => void token.set(r ?? {}))
        .finally(() => (inFlight = undefined))
      return inFlight
    }
    return async (input, init) => {
      if (!isPathIgnored(input)) {
        await refreshIfExpired()
        const at = accessToken()
        if (at) {
          const headers = new Headers(init?.headers)
          headers.set('Authorization', at)
          if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
          const response = await globalThis.fetch(input, { ...init, headers })
          if (response.status === 401) {
            token.set(await response.json())
          }
          return response
        }
      }
      return globalThis.fetch(input, init)
    }
  }
})

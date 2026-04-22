import { inject, InjectionToken } from '@angular/core'
import { accessToken, isExpiredToken, token } from './token'
import { config, ignorePaths } from './config'
import { OAUTH_REFRESH } from './functions'

const getPath = (input: RequestInfo | URL): string =>
  input instanceof URL ? input.pathname : input instanceof Request ? new URL(input.url).pathname : input

const isPathIgnored = (input: RequestInfo | URL) => ignorePaths().some(pattern => pattern.test(getPath(input)))

export const OAUTH_FETCH = new InjectionToken<typeof fetch>('OAUTH_FETCH', {
  providedIn: 'root',
  factory: () => {
    const refreshFn = inject(OAUTH_REFRESH)
    return async (input, init) => {
      if (!isPathIgnored(input)) {
        if (isExpiredToken(token())) {
          token.set((await refreshFn(token(), config() as any)) ?? {})
        }
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

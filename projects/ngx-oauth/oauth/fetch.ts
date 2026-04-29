import { computed, inject, InjectionToken } from '@angular/core'
import { OAUTH_TOKEN } from './token'
import { oauthConfig } from './config'

const getPath = (input: RequestInfo | URL): string =>
  input instanceof URL ? input.pathname : input instanceof Request ? new URL(input.url).pathname : input

const isPathIgnored = (input: RequestInfo | URL) => ignorePaths().some(pattern => pattern.test(getPath(input)))
const ignorePaths = computed(() => oauthConfig().ignorePaths as RegExp[])

export const OAUTH_FETCH = new InjectionToken<typeof fetch>('OAUTH_FETCH', {
  providedIn: 'root',
  factory: () => {
    const { token, accessToken, checkToken } = inject(OAUTH_TOKEN)
    return async (input, init) => {
      if (!isPathIgnored(input)) {
        await checkToken(token())
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

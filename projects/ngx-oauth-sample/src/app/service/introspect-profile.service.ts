import { Injectable, computed, inject, resource } from '@angular/core'
import { OAUTH, OAuthStatus } from 'ngx-oauth'
import { ProfileService } from './index'

/**
 * Fetch profile by calling the token introspection endpoint directly.
 * Bypasses OAUTH_FETCH because introspection uses Basic (client) auth, not Bearer.
 */
@Injectable({ providedIn: 'root' })
export class IntrospectProfileService implements ProfileService {
  private introspectPath = '/auth/realms/commerce/protocol/openid-connect/token/introspect'
  private clientId = 'hybris'
  private clientSecret = '2519368d-8c92-44c9-ba4c-5f3763bc38c9'

  private oauth = inject(OAUTH)

  private introspect = resource<{ name?: string } | undefined, { token?: string }>({
    params: () => ({
      token: this.oauth.status() === OAuthStatus.AUTHORIZED ? this.oauth.token().access_token : undefined
    }),
    loader: async ({ params }) => {
      if (!params.token) return undefined
      const res = await globalThis.fetch(this.introspectPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`
        },
        body: new URLSearchParams({ token: params.token })
      })
      return res.json()
    }
  })

  readonly profileName = computed(() => this.introspect.value()?.name)
}

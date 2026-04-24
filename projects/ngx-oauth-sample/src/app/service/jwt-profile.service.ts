import { Injectable, computed, inject } from '@angular/core'
import { OAUTH, OAuthStatus } from 'ngx-oauth'
import { ProfileService } from './index'

/**
 * Parse profile from the id_token JWT claims.
 */
@Injectable({ providedIn: 'root' })
export class JwtProfileService implements ProfileService {
  private oauth = inject(OAUTH)

  readonly profileName = computed(() => {
    if (this.oauth.status() !== OAuthStatus.AUTHORIZED) return undefined
    const id = this.oauth.token().id_token
    if (!id) return undefined
    try {
      const payload = JSON.parse(atob(id.split('.')[1]))
      return payload.name || payload.username || payload.email || payload.sub
    } catch {
      return undefined
    }
  })
}

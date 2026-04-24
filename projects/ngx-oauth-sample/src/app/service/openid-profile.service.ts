import { Injectable, computed, inject } from '@angular/core'
import { OAUTH_USER } from 'ngx-oauth'
import { ProfileService } from './index'

/**
 * Get profile from OpenID userinfo endpoint
 */
@Injectable({ providedIn: 'root' })
export class OpenidProfileService implements ProfileService {
  private user = inject(OAUTH_USER)

  readonly profileName = computed(() => {
    const v = this.user.value()
    if (!v) return undefined
    return `${v.name ?? ''}${this.renderPicture(v.picture)}`
  })

  private renderPicture(picture?: string) {
    return (picture && `&nbsp;<img class="rounded-circle img-thumbnail" src="${picture}">`) || ''
  }
}

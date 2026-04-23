import { linkedSignal, signal } from '@angular/core'
import { OAuthConfig } from './types'

export const oauthConfig = signal<OAuthConfig>({
  storageKey: 'token',
  ignorePaths: [],
  strictJwt: true
})

export const config = linkedSignal(() => oauthConfig().config)

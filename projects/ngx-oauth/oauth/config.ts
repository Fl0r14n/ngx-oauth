import { computed, linkedSignal, signal } from '@angular/core'
import { OAuthConfig } from './types'

export const oauthConfig = signal<OAuthConfig>({
  storageKey: 'token',
  ignorePaths: [],
  strictJwt: true
})

export const config = linkedSignal(() => oauthConfig().config)
export const storageKey = linkedSignal(() => oauthConfig().storageKey as string)
export const ignorePaths = computed(() => oauthConfig().ignorePaths as RegExp[])
export const strictJwt = computed(() => oauthConfig().strictJwt)

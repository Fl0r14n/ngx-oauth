import {
  EnvironmentProviders,
  linkedSignal,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
  signal
} from '@angular/core'
import { OAuthConfig } from './types'

const defaults: OAuthConfig = {
  storageKey: 'token',
  ignorePaths: [],
  strictJwt: true
}

export const oauthConfig = signal<OAuthConfig>(defaults)

export const config = linkedSignal(() => oauthConfig().config)

export const provideOAuthConfig = (cfg: OAuthConfig = {}): EnvironmentProviders =>
  makeEnvironmentProviders([
    provideEnvironmentInitializer(() => oauthConfig.set({ ...defaults, ...cfg }))
  ])

import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core'
import { provideRouter } from '@angular/router'

import { provideClientHydration } from '@angular/platform-browser'
import { provideOAuthConfig } from 'ngx-oauth'
import { routes } from './app.routes'

const googleIDConfig = {
  config: {
    issuerPath: 'https://accounts.google.com',
    clientId: '1016377348682-sjktm6r8ak11spfb84kb4gjpkkgdcf5h.apps.googleusercontent.com',
    scope: 'openid profile email phone'
  }
}

export const appConfig: ApplicationConfig = {
  providers: [provideZonelessChangeDetection(), provideRouter(routes), provideClientHydration(), provideOAuthConfig(googleIDConfig)]
}

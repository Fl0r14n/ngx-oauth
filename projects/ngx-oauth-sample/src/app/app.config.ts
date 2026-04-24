import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core'
import { provideRouter } from '@angular/router'

import { routes } from './app.routes'
import { provideClientHydration } from '@angular/platform-browser'
import { PROFILE_SERVICE } from './service'
import { OpenidProfileService } from './service/openid-profile.service'
import { provideHttpClient, withFetch } from '@angular/common/http'
import { provideOAuthConfig } from 'ngx-oauth'

const keycloakOpenIDConfig = {
  config: {
    issuerPath: 'http://localhost:8080/realms/commerce',
    clientId: 'ngx-oauth',
    logoutRedirectUri: 'https://localhost:4200'
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(withFetch()),
    provideOAuthConfig(keycloakOpenIDConfig),
    { provide: PROFILE_SERVICE, useExisting: OpenidProfileService }
  ]
}

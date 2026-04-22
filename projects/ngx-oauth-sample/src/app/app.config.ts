import { ApplicationConfig } from '@angular/core'
import { provideRouter } from '@angular/router'

import { routes } from './app.routes'
import { provideClientHydration } from '@angular/platform-browser'
import { PROFILE_SERVICE } from './service'
import { OpenidProfileService } from './service/openid-profile.service'
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http'
import { OAuthInterceptor, provideOAuthConfig } from 'ngx-oauth'

const keycloakOpenIDConfig = {
  config: {
    issuerPath: 'http://localhost:8080/realms/commerce',
    clientId: 'ngx-oauth',
    logoutRedirectUri: 'https://localhost:4200'
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(withFetch(), withInterceptors([OAuthInterceptor])),
    provideOAuthConfig(keycloakOpenIDConfig),
    {
      provide: PROFILE_SERVICE,
      useExisting: OpenidProfileService
    }
  ]
}

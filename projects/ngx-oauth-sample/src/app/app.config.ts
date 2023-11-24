import {ApplicationConfig} from '@angular/core';
import {provideRouter} from '@angular/router';

import {routes} from './app.routes';
import {provideClientHydration} from '@angular/platform-browser';
import {PROFILE_SERVICE} from './service';
import {OpenidProfileService} from './service/openid-profile.service';
import {provideHttpClient, withFetch, withInterceptorsFromDi} from '@angular/common/http';
import {provideOAuthInterceptor, provideOAuthConfig} from 'ngx-oauth';

const sapCommerceConfig = {
  config: {
    authorizePath: '/authorizationserver/oauth/authorize',
    revokePath: '/authorizationserver/oauth/revoke',
    clientId: 'mobile_android',
    tokenPath: '/authorizationserver/oauth/token',
    userPath: '/occ/v2/electronics-spa/users/current',
    clientSecret: 'secret',
    scope: 'basic'
  }
};

const djangoConfig = {
  config: {
    clientId: 'client_application',
    clientSecret: 'client_secret',
    authorizePath: '/o/authorize/',
    tokenPath: '/o/token/',
    revokePath: '/o/revoke/',
    scope: 'openid',
    pkce: true
  }
};

const keycloakOpenIDConfig = {
  config: {
    issuerPath: 'http://localhost:8080/realms/commerce',
    clientId: 'ngx-oauth',
    logoutRedirectUri: 'https://localhost:4200'
  }
};

const azureOpenIDConfig = {
  config: {
    issuerPath: 'https://login.microsoftonline.com/common/v2.0', // for common make sure you app has "signInAudience": "AzureADandPersonalMicrosoftAccount",
    clientId: 'clientId',
    scope: 'openid profile email offline_access',
    pkce: true // manually since is required but code_challenge_methods_supported is not in openid configuration
  }
};

const googleOpenIDConfig = {
  config: {
    issuerPath: 'https://accounts.google.com',
    clientId: 'clientId',
    clientSecret: 'clientSecret',
    scope: 'openid profile email',
  }
};

const gigyaOpenIdConfig = {
  config: {
    // because issuerPath will give wrong paths
    authorizePath: 'https://fidm.eu1.gigya.com/oidc/op/v1.0/<<tenantId>>/authorize',
    tokenPath: 'https://fidm.eu1.gigya.com/oidc/op/v1.0/<<tenantId>>/token',
    userPath: 'https://fidm.eu1.gigya.com/oidc/op/v1.0/<<tenantId>>/userinfo',
    revokePath: 'https://fidm.eu1.gigya.com/oidc/op/v1.0/<<tenantId>>/revoke',
    pkce: true,
    clientId: 'clientId',
    scope: 'openid profile email',
  }
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(
      withFetch(),
      withInterceptorsFromDi()
    ),
    provideOAuthConfig(keycloakOpenIDConfig),
    provideOAuthInterceptor(),
    {
      provide: PROFILE_SERVICE,
      useExisting: OpenidProfileService
    },
  ]
};

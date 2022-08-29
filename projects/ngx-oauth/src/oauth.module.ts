import {ModuleWithProviders, NgModule, Optional, PLATFORM_ID} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {HTTP_INTERCEPTORS, HttpBackend, HttpClient, HttpClientModule} from '@angular/common/http';
import {RouterModule} from '@angular/router';
import {LOCATION, OAUTH_HTTP_CLIENT, OAuthConfig, provideOAuthConfigFactory, SERVER_HOST, SERVER_PATH, STORAGE} from './models';
import {OAuthService} from './services/oauth.service';
import {OAuthLoginComponent} from './components/login/oauth-login.component';
import {CommonModule, isPlatformBrowser} from '@angular/common';
import {OAuthInterceptor} from './services/oauth.interceptor';
import {OAuthTokenService} from './services/token.service';

const mockLocation = (serverHost: string, serverPath: string): Location => {
  const url = new URL(serverHost && serverPath ? `${serverHost}${serverPath}` : 'http://localhost');
  const {href, origin, protocol, host, hostname, port, pathname, search, hash} = url;
  return {
    href, origin, protocol, host, hostname, port, pathname, search, hash,
    reload() {
    },
    assign(_: string) {
    },
    ancestorOrigins: {} as any,
    replace(_: string) {
    }
  };
};

const LocationService = {
  provide: LOCATION,
  useFactory(platformId: Object, serverHost: string, serverPath: string) {
    return isPlatformBrowser(platformId) ? location : mockLocation(serverHost, serverPath);
  },
  deps: [
    PLATFORM_ID,
    [new Optional(), SERVER_HOST],
    [new Optional(), SERVER_PATH]
  ]
};

const mockStorage: Storage = {
  clear() {
  },
  getItem(key: string) {
    return null;
  },
  key(index: number) {
    return null;
  },
  removeItem(key: string) {
  },
  setItem(key: string, value: string) {
  },
  length: 0
};

const StorageService = {
  provide: STORAGE,
  useFactory(platformId: Object) {
    return isPlatformBrowser(platformId) ? localStorage : mockStorage;
  },
  deps: [PLATFORM_ID]
};

const OAuthHttpClient = {
  provide: OAUTH_HTTP_CLIENT,
  useFactory(httpBackend: HttpBackend) {
    // avoid http interceptors
    return new HttpClient(httpBackend);
  },
  deps: [HttpBackend]
};

const OAuthInterceptorService = {
  provide: HTTP_INTERCEPTORS,
  useClass: OAuthInterceptor,
  multi: true,
};

const defaultConfig = (storage: Storage) => {
  return {
    storage,
    storageKey: 'token',
    ignorePaths: []
  };
};

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    RouterModule,
  ],
  declarations: [OAuthLoginComponent],
  exports: [OAuthLoginComponent]
})
export class OAuthModule {

  static forRoot(config: OAuthConfig = {}): ModuleWithProviders<OAuthModule> {
    return {
      ngModule: OAuthModule,
      providers: [
        LocationService,
        StorageService,
        OAuthHttpClient,
        provideOAuthConfigFactory((storage: Storage) => ({
          ...defaultConfig(storage),
          ...config
        }), [STORAGE]),
        OAuthTokenService,
        OAuthInterceptorService,
        OAuthService,
      ]
    };
  }
}

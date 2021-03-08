import {ModuleWithProviders, NgModule, Optional, PLATFORM_ID} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {FormsModule} from '@angular/forms';
import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';
import {RouterModule} from '@angular/router';
import {OAuthConfig, OAUTH_CONFIG, LOCATION, SERVER_HOST, SERVER_PATH, STORAGE} from './models';
import {OAuthService} from './services/oauth.service';
import {OAuthLoginComponent} from './components/login/oauth-login.component';
import {isPlatformBrowser} from '@angular/common';
import {OAuthInterceptor} from './services/oauth.interceptor';

const mockLocation = (serverHost: string, serverPath: string): Location => {
  const url = new URL(serverHost && serverPath ? `${serverHost}${serverPath}` : 'http://localhost');
  const {href, origin, protocol, host, hostname, port, pathname, search, hash} = url;
  return {
    href, origin, protocol, host, hostname, port, pathname, search, hash,
    reload() {
    },
    assign(u: string) {
    },
    ancestorOrigins: null,
    replace(u: string) {
    }
  };
};

const LocationService = {
  provide: LOCATION,
  useFactory(platformId, serverHost?: string, serverPath?: string) {
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
    return undefined as string;
  },
  key(index: number) {
    return undefined as string;
  },
  removeItem(key: string) {
  },
  setItem(key: string, value: string) {
  },
  length: 0
};

const StorageService = {
  provide: STORAGE,
  useFactory(platformId) {
    return isPlatformBrowser(platformId) ? localStorage : mockStorage;
  },
  deps: [PLATFORM_ID]
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
    BrowserModule,
    FormsModule,
    HttpClientModule,
    RouterModule
  ],
  declarations: [OAuthLoginComponent],
  exports: [OAuthLoginComponent],
  providers: [
    LocationService,
    StorageService,
    OAuthService,
    OAuthInterceptorService,
  ]
})
export class OAuthModule {

  static forRoot(config: OAuthConfig): ModuleWithProviders<OAuthModule> {
    return {
      ngModule: OAuthModule,
      providers: [
        LocationService,
        StorageService,
        OAuthService,
        OAuthInterceptorService,
        {
          provide: OAUTH_CONFIG,
          useFactory(storage: Storage) {
            return {
              ...defaultConfig(storage),
              ...config,
            };
          },
          deps: [
            STORAGE
          ]
        }
      ]
    };
  }
}

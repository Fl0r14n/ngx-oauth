import {FactoryProvider, inject, Injectable, InjectionToken, ValueProvider} from '@angular/core';
import {OAuthTypeConfig} from '../models';

export const OAUTH_CONFIG = new InjectionToken<OAuthConfig[]>('OAuthConfig');

@Injectable({
  providedIn: 'root',
  useFactory: () => inject(OAUTH_CONFIG).reduce((p, c) => ({...p, ...c}), defaultOAuthConfig)
})
export abstract class OAuthConfig {
  config?: OAuthTypeConfig;
  storageKey?: string;
  storage?: Storage;
  location?: Location
  ignorePaths?: RegExp[];

  [x: string]: any;
}

export const provideOAuthConfig = (config: OAuthConfig = {}): ValueProvider => ({
  provide: OAUTH_CONFIG,
  useValue: config,
  multi: true
});

export const provideOAuthConfigFactory = (factory: Function, deps?: any[]): FactoryProvider => ({
  provide: OAUTH_CONFIG,
  useFactory: factory,
  deps: deps,
  multi: true
});

export const defaultOAuthConfig: OAuthConfig = {
  storage: globalThis.localStorage,
  location: globalThis.location,
  storageKey: 'token',
  ignorePaths: []
}

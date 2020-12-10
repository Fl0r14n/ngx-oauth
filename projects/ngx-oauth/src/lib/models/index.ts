import {InjectionToken} from '@angular/core';

export const LOCATION = new InjectionToken<Location>('Location');
export const OAuthConfigService = new InjectionToken<OAuthConfig>('OAuthConfig');

export enum OAuthType {
  RESOURCE = 'password',
  AUTHORIZATION_CODE = 'code',
  IMPLICIT = 'token',
  CLIENT_CREDENTIAL = 'client_credentials'
}

export interface OAuthConfig {
  type: OAuthType;
  config: ResourceConfig | ImplicitConfig | AuthorizationCodeConfig | ClientCredentialConfig;
  storageKey?: string;
  storage?: Storage;
  ignorePaths?: RegExp[];
}

export interface ResourceParameters {
  username: string;
  password: string;
}

export interface ResourceConfig {
  tokenPath: string;
  clientId: string;
  clientSecret: string;
}

export interface AuthorizationCodeParameters {
  redirectUri: string;
  scope?: string;
  state?: string;
}

export interface AuthorizationCodeConfig {
  authorizePath: string;
  tokenPath: string;
  clientId: string;
  clientSecret: string;
}

export interface ImplicitParameters {
  redirectUri: string;
  scope?: string;
  state?: string;
}

export interface ImplicitConfig {
  authorizePath: string;
  clientId: string;
}

export interface ClientCredentialConfig {
  tokenPath: string;
  clientId: string;
  clientSecret: string;
}

export type OAuthParameters = ResourceParameters | AuthorizationCodeParameters | ImplicitParameters;
export type OAuthTypeConfig = ResourceConfig | ImplicitConfig | AuthorizationCodeConfig | ClientCredentialConfig;

export interface OAuthToken {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  state?: string;
  error?: string;
  expires_in?: string;
}

export enum OAuthStatus {
  NOT_AUTHORIZED = 'NOT_AUTHORIZED',
  AUTHORIZED = 'AUTHORIZED',
  DENIED = 'DENIED'
}

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

export const OAuthDefaultConfig = {
  storage: typeof localStorage !== 'undefined' && localStorage || mockStorage,
  storageKey: 'token',
  ignorePaths: []
};

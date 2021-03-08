import {InjectionToken} from '@angular/core';

export const SERVER_HOST = new InjectionToken<string>('SERVER_HOST');
export const SERVER_PATH = new InjectionToken<string>('SERVER_PATH');
export const LOCATION = new InjectionToken<Location>('Location');
export const STORAGE = new InjectionToken<Storage>('Storage');
export const OAUTH_CONFIG = new InjectionToken<OAuthConfig>('OAuthConfig');

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

export interface ClientCredentialConfig {
  tokenPath: string;
  revokePath?: string;
  clientId: string;
  clientSecret: string;
}

// tslint:disable-next-line:no-empty-interface
export interface ResourceConfig extends ClientCredentialConfig {
}

export interface ImplicitConfig {
  authorizePath: string;
  revokePath?: string;
  clientId: string;
}

export interface AuthorizationCodeConfig extends ResourceConfig {
  authorizePath: string;
}

export interface ResourceParameters {
  username: string;
  password: string;
}

export interface ImplicitParameters {
  redirectUri: string;
  scope?: string;
  state?: string;
}

// tslint:disable-next-line:no-empty-interface
export interface AuthorizationCodeParameters extends ImplicitParameters {
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

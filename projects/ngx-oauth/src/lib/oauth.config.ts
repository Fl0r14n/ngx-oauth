import {InjectionToken} from '@angular/core';

export const OAuthConfigService = new InjectionToken<OAuthConfig>('OAuthConfig');

export enum OAuthFlows {
  RESOURCE = 'RESOURCE',
  AUTHORIZATION_CODE = 'AUTHORIZATION_CODE',
  IMPLICIT = 'IMPLICIT',
  CLIENT_CREDENTIAL = 'CLIENT_CREDENTIAL'
}

export interface OAuthConfig {
  flowType: OAuthFlows;
  flowConfig: ResourceFlowConfig | ImplicitFlowConfig | AuthorizationCodeFlowConfig | ClientCredentialFlowConfig;
  storageKey: string;
  storage: Storage;
}

export interface ResourceFlowLoginParameters {
  username: string;
  password: string;
}

export interface ResourceFlowConfig {
  tokenPath: string;
  clientId: string;
  clientSecret: string;
}

export interface AuthorizationCodeFlowLoginParameters {
  redirectUri: string;
  scope?: string;
  state?: string;
}

export interface AuthorizationCodeFlowConfig {
  authorizePath: string;
  tokenPath: string;
  clientId: string;
  clientSecret: string;
}

export interface ImplicitLoginParameters {
  redirectUri: string;
  scope?: string;
  state?: string;
}

export interface ImplicitFlowConfig {
  authorizePath: string;
  clientId: string;
}

export interface ClientCredentialFlowConfig {
  tokenPath: string;
  clientId: string;
  clientSecret: string;
}

export type LoginParameters = ResourceFlowLoginParameters | AuthorizationCodeFlowLoginParameters | ImplicitLoginParameters;

export interface Token {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  state?: string;
  error?: string;
  expires_in?: number;
}
export enum OAuthStatusTypes {
  NOT_AUTHORIZED = 'NOT_AUTHORIZED',
  AUTHORIZED = 'AUTHORIZED',
  DENIED = 'DENIED'
}

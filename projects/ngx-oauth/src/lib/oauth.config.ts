export interface OAuthConfig {
  clientId: string;
  redirectUri?: string;
  profileUri?: string;
  scope?: string;
  state?: string;
  storage?: Storage;
}

export interface ResourceOAuthConfig extends OAuthConfig {
  tokenPath: string;
  username: string;
  password: string;
  clientSecret: string;
  grantType?: string;
}

export interface ImplicitOAuthConfig extends OAuthConfig {
  authorizePath: string;
  responseType?: string;
}

export class DefaultOAuthConfig implements ResourceOAuthConfig, ImplicitOAuthConfig {
  authorizePath: string = null;
  tokenPath: string = null;
  profileUri: string = null;
  redirectUri = window.location.origin;
  clientId = 'client';
  clientSecret = '';
  grantType = 'password';
  username = '';
  password = '';
  responseType = 'token';
  scope = '';
  state = '';
  storage = sessionStorage;
}

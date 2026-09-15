export type ClientCredentialConfig = {
  tokenPath: string
  revokePath?: string
  clientId: string
  clientSecret?: string
  scope?: string
  userPath?: string
  introspectionPath?: string
}

export type ResourceOwnerConfig = ClientCredentialConfig

export type ImplicitConfig = {
  authorizePath: string
  revokePath?: string
  clientId: string
  scope?: string
  logoutPath?: string
  redirectUri?: string // if not using OAuthParameters
  logoutRedirectUri?: string // if not using OAuthParameters
  userPath?: string
}

export type AuthorizationCodeConfig = ResourceOwnerConfig & {
  authorizePath: string
  logoutPath?: string
  redirectUri?: string // if not using OAuthParameters
  logoutRedirectUri?: string // if not using OAuthParameters
}

export type AuthorizationCodePKCEConfig = AuthorizationCodeConfig & {
  pkce?: boolean
}

export type OpenIdConfig = AuthorizationCodePKCEConfig & {
  issuerPath: string
  jwksUri?: string
}

export type ResourceOwnerParameters = {
  username: string
  password: string
}

export type AuthorizationCodeParameters = {
  accessType?: 'online' | 'offline'
  prompt?: 'none' | 'consent' | 'login' | 'select_account'
  redirectUri: string
  responseType: OAuthType.IMPLICIT | OAuthType.AUTHORIZATION_CODE | string
  state?: string
}

export type OAuthParameters = ResourceOwnerParameters | AuthorizationCodeParameters
export type OAuthTypeConfig =
  OpenIdConfig | AuthorizationCodePKCEConfig | AuthorizationCodeConfig | ImplicitConfig | ResourceOwnerConfig | ClientCredentialConfig

/** Closed, unlike `OAuthToken` and `UserInfo`: this is the one object *you* write, in one place, so a
 * misspelled option has no other detector — and the nesting makes the mistake plausible rather than
 * clumsy. `scope`, `clientId` and the other provider fields belong in `config`; set at this level they
 * would compile and reach nothing. Carry your own fields by naming them: `OAuthConfig<{ tenant: string }>`. */
export type OAuthConfig<TExtra = unknown> = {
  config?: Partial<OAuthTypeConfig>
  storageKey?: string
  ignorePaths?: RegExp[]
  strictJwt?: boolean
} & TExtra

export enum OAuthType {
  RESOURCE = 'password',
  AUTHORIZATION_CODE = 'code',
  IMPLICIT = 'token',
  CLIENT_CREDENTIAL = 'client_credentials'
}

/** Open on purpose: RFC 6749 §5.1 permits additional parameters, and this arrives parsed off the wire, so
 * there is no author to protect from a typo. Name the extras you use through `TExtra` for autocomplete. */
export type OAuthToken<TExtra = unknown> = {
  id_token?: string
  access_token?: string
  refresh_token?: string
  token_type?: string
  state?: string
  error?: string
  error_description?: string
  expires_in?: number | string
  refresh_expires_in?: number | string
  scope?: string
  code_verifier?: string
  nonce?: string
  type?: OAuthType
  expires?: number
  code?: string

  [x: string]: any
} & TExtra

export enum OAuthStatus {
  NOT_AUTHORIZED = 'NOT_AUTHORIZED',
  AUTHORIZED = 'AUTHORIZED',
  DENIED = 'DENIED'
}

export type OpenIdConfiguration = {
  issuer?: string
  authorization_endpoint?: string
  introspection_endpoint?: string
  token_endpoint?: string
  userinfo_endpoint?: string
  end_session_endpoint?: string
  revocation_endpoint?: string
  jwks_uri?: string
  scopes_supported?: string[]
  code_challenge_methods_supported?: string[]
}

/** The standard OIDC claims, open for the rest — a claim set is whatever the provider issues. */
export type UserInfo<TClaims = unknown> = {
  email?: string
  email_verified?: boolean
  family_name?: string
  given_name?: string
  name?: string
  preferred_username?: string
  sub?: string
  address?: object
  picture?: string
  locale?: string

  [x: string]: any
} & TClaims

export type IntrospectInfo = UserInfo & {
  active: boolean
  scope: string
  client_id?: string
  username: string
  exp: number
}

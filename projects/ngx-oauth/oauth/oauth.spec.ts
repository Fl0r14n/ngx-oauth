jest.mock('jose', () => ({ createRemoteJWKSet: jest.fn(), jwtVerify: jest.fn() }))
// jsdom lacks crypto.subtle; use Node's webcrypto for the PKCE path.
if (!(globalThis.crypto as any)?.subtle) {
  const nodeCrypto = eval('require')('node:crypto')
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: nodeCrypto.webcrypto })
}
import { TestBed } from '@angular/core/testing'
import { OAUTH } from './oauth'
import { OAUTH_TOKEN } from './token'
import {
  OAUTH_AUTHORIZE,
  OAUTH_CLIENT_CREDENTIAL,
  OAUTH_OPENID_CONFIG,
  OAUTH_REFRESH,
  OAUTH_RESOURCE_OWNER,
  OAUTH_REVOKE
} from './functions'
import { OAUTH_VERIFY_JWT } from './jwt'
import { oauthConfig, config } from './config'
import { OAuthType } from './types'

const flush = async () => {
  for (let i = 0; i < 20; i++) {
    await Promise.resolve()
    TestBed.tick()
  }
}

describe('OAUTH', () => {
  let resourceOwnerLogin: jest.Mock
  let clientCredentialLogin: jest.Mock
  let revoke: jest.Mock
  let authorize: jest.Mock
  let openIdConfiguration: jest.Mock
  let verifyJwt: jest.Mock
  let refresh: jest.Mock

  const setup = (initialConfig: any = { clientId: 'c', authorizePath: '/auth', tokenPath: '/t' }) => {
    localStorage.clear()
    oauthConfig.set({ storageKey: 'token', ignorePaths: [], strictJwt: true })
    config.set(initialConfig)
    resourceOwnerLogin = jest.fn().mockResolvedValue(undefined)
    clientCredentialLogin = jest.fn().mockResolvedValue(undefined)
    revoke = jest.fn().mockResolvedValue(undefined)
    authorize = jest.fn().mockResolvedValue(undefined)
    openIdConfiguration = jest.fn().mockResolvedValue(undefined)
    verifyJwt = jest.fn().mockResolvedValue({})
    refresh = jest.fn().mockResolvedValue(undefined)
    TestBed.configureTestingModule({
      providers: [
        { provide: OAUTH_RESOURCE_OWNER, useValue: resourceOwnerLogin },
        { provide: OAUTH_CLIENT_CREDENTIAL, useValue: clientCredentialLogin },
        { provide: OAUTH_REVOKE, useValue: revoke },
        { provide: OAUTH_AUTHORIZE, useValue: authorize },
        { provide: OAUTH_OPENID_CONFIG, useValue: openIdConfiguration },
        { provide: OAUTH_VERIFY_JWT, useValue: verifyJwt },
        { provide: OAUTH_REFRESH, useValue: refresh }
      ]
    })
    return { oauth: TestBed.inject(OAUTH), tokenApi: TestBed.inject(OAUTH_TOKEN) }
  }

  // jsdom's location.replace is read-only; we silence the "Not implemented: navigation"
  // warnings from jsdom and assert on observable token state instead.
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(jest.fn())
  })
  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('login', () => {
    it('calls resourceOwnerLogin when parameters include password', async () => {
      const { oauth } = setup()
      resourceOwnerLogin.mockResolvedValue({ access_token: 'ro' })
      await oauth.login({ username: 'u', password: 'p' })
      expect(resourceOwnerLogin).toHaveBeenCalledWith({ username: 'u', password: 'p' }, expect.any(Object))
      expect(oauth.token().access_token).toBe('ro')
    })

    it('stores redirect_uri and nonce on token for authorization_code flow', async () => {
      const { oauth } = setup({ clientId: 'c', authorizePath: '/auth', scope: 'openid' })
      await oauth.login({ redirectUri: 'https://app/cb', responseType: OAuthType.AUTHORIZATION_CODE })
      expect(oauth.token()['redirect_uri']).toBe('https://app/cb')
      expect(oauth.token().nonce).toBeTruthy()
    })

    it('stores code_verifier on token when pkce is enabled', async () => {
      const { oauth } = setup({ clientId: 'c', authorizePath: '/auth', scope: 'openid', pkce: true })
      await oauth.login({ redirectUri: 'https://app/cb', responseType: OAuthType.AUTHORIZATION_CODE })
      expect(oauth.token().code_verifier).toBeTruthy()
    })

    it('calls clientCredentialLogin when no parameters', async () => {
      const { oauth } = setup()
      clientCredentialLogin.mockResolvedValue({ access_token: 'cc' })
      await oauth.login()
      expect(clientCredentialLogin).toHaveBeenCalled()
      expect(oauth.token().access_token).toBe('cc')
    })
  })

  describe('logout', () => {
    it('clears the token when logoutPath + URI provided (redirect path)', async () => {
      const { oauth, tokenApi } = setup({ clientId: 'c', logoutPath: '/logout' })
      tokenApi.token.set({ id_token: 'idt' })
      await flush()
      await oauth.logout('https://app/bye', 's1')
      expect(oauth.token()).toEqual({})
      // redirect path does not call revoke
      expect(revoke).not.toHaveBeenCalled()
    })

    it('revokes when no redirect URI', async () => {
      const { oauth, tokenApi } = setup({ revokePath: '/revoke' })
      tokenApi.token.set({ access_token: 'at' })
      await flush()
      await oauth.logout()
      expect(revoke).toHaveBeenCalled()
      expect(oauth.token()).toEqual({})
    })
  })

  describe('oauthCallback', () => {
    it('handles implicit redirect with token', async () => {
      const { oauth } = setup()
      verifyJwt.mockResolvedValue({ nonce: undefined })
      await oauth.oauthCallback('https://app/cb#access_token=at&token_type=Bearer&state=s1')
      expect(oauth.token().access_token).toBe('at')
      expect(oauth.token().type).toBe(OAuthType.IMPLICIT)
      expect(oauth.state()).toBe('s1')
    })

    it('passes IdP errors through instead of masking as Invalid nonce', async () => {
      const { oauth } = setup()
      await oauth.oauthCallback('https://app/cb#error=access_denied&error_description=user_cancelled&state=s1')
      expect(oauth.token().error).toBe('access_denied')
      expect(oauth.token().error_description).toBe('user_cancelled')
      expect(verifyJwt).not.toHaveBeenCalled()
    })

    it('handles authorization_code redirect by calling authorize then storing result', async () => {
      const { oauth } = setup({ clientId: 'c', tokenPath: '/t' })
      authorize.mockResolvedValue({ access_token: 'exchanged', type: OAuthType.AUTHORIZATION_CODE })
      await oauth.oauthCallback('https://app/cb?code=abc&state=s2')
      expect(authorize).toHaveBeenCalled()
      expect(oauth.token().access_token).toBe('exchanged')
      expect(oauth.state()).toBe('s2')
    })

    it('rejects with Invalid nonce when payload nonce mismatches', async () => {
      const { oauth, tokenApi } = setup()
      tokenApi.token.set({ nonce: 'expected' })
      await flush()
      verifyJwt.mockResolvedValue({ nonce: 'different' })
      await oauth.oauthCallback('https://app/cb#access_token=at&id_token=abc.def.ghi&token_type=Bearer')
      expect(oauth.token().error).toBe('Invalid nonce')
    })

    it('does nothing when URL has no redirect markers', async () => {
      const { oauth } = setup()
      await oauth.oauthCallback('https://app/home')
      expect(verifyJwt).not.toHaveBeenCalled()
      expect(authorize).not.toHaveBeenCalled()
    })
  })

  describe('autoconfigOauth via login', () => {
    it('merges discovery endpoints into config', async () => {
      const { oauth } = setup({ issuerPath: 'https://idp', clientId: 'c' })
      openIdConfiguration.mockResolvedValue({
        token_endpoint: 'https://idp/token',
        authorization_endpoint: 'https://idp/auth',
        revocation_endpoint: 'https://idp/revoke'
      })
      await oauth.login()
      const cfg = config() as any
      expect(cfg.tokenPath).toBe('https://idp/token')
      expect(cfg.authorizePath).toBe('https://idp/auth')
      expect(cfg.revokePath).toBe('https://idp/revoke')
    })
  })
})

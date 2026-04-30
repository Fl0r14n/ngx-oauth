import type { Mock } from 'vitest'
import { TestBed } from '@angular/core/testing'
import { OAUTH_TOKEN } from './token'
import { OAUTH_OPENID_CONFIG, OAUTH_REFRESH } from './functions'
import { oauthConfig, config } from './config'
import { OAuthStatus, OAuthToken } from './types'

const flush = async () => {
  for (let i = 0; i < 20; i++) {
    await Promise.resolve()
    TestBed.tick()
  }
}

describe('OAUTH_TOKEN', () => {
  let refreshMock: Mock
  let openIdConfigMock: Mock

  const setup = (initial?: OAuthToken) => {
    localStorage.clear()
    oauthConfig.set({ storageKey: 'token', ignorePaths: [], strictJwt: true })
    config.set(undefined as any)
    if (initial) localStorage.setItem('token', JSON.stringify(initial))
    refreshMock = vi.fn()
    openIdConfigMock = vi.fn().mockResolvedValue(undefined)
    TestBed.configureTestingModule({
      providers: [
        { provide: OAUTH_REFRESH, useValue: refreshMock },
        { provide: OAUTH_OPENID_CONFIG, useValue: openIdConfigMock }
      ]
    })
    return TestBed.inject(OAUTH_TOKEN)
  }

  it('defaults token to empty object and status to NOT_AUTHORIZED', () => {
    const api = setup()
    expect(api.token()).toEqual({})
    expect(api.status()).toBe(OAuthStatus.NOT_AUTHORIZED)
    expect(api.isAuthorized()).toBe(false)
  })

  it('reads the initial token from localStorage', () => {
    const api = setup({ access_token: 'seeded', token_type: 'Bearer' })
    expect(api.token().access_token).toBe('seeded')
  })

  it('derives AUTHORIZED status from access_token', () => {
    const api = setup()
    api.token.set({ access_token: 'a', token_type: 'Bearer' })
    expect(api.status()).toBe(OAuthStatus.AUTHORIZED)
    expect(api.isAuthorized()).toBe(true)
  })

  it('derives DENIED status from error', () => {
    const api = setup()
    api.token.set({ error: 'access_denied', error_description: 'bad' })
    expect(api.status()).toBe(OAuthStatus.DENIED)
    expect(api.error()).toBe('access_denied')
    expect(api.hasError()).toBe(true)
    expect(api.errorDescription()).toBe('bad')
  })

  it('treats expired access_token as NOT_AUTHORIZED', () => {
    const api = setup()
    api.token.set({ access_token: 'a', expires: Date.now() - 1000 })
    expect(api.status()).toBe(OAuthStatus.NOT_AUTHORIZED)
  })

  it('builds "Bearer <token>" accessToken', () => {
    const api = setup()
    api.token.set({ access_token: 'abc', token_type: 'Bearer' })
    expect(api.accessToken()).toBe('Bearer abc')
  })

  it('accessToken is undefined without token_type', () => {
    const api = setup()
    api.token.set({ access_token: 'abc' })
    expect(api.accessToken()).toBeUndefined()
  })

  it('effect stamps expires when expires_in present and expires missing', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000)
    const api = setup()
    api.token.set({ access_token: 'a', expires_in: 60 })
    TestBed.tick()
    expect(api.token().expires).toBe(1000 + 60 * 1000)
    ;(Date.now as Mock).mockRestore()
  })

  it('effect calls refresh when token is expired', async () => {
    const api = setup()
    refreshMock.mockResolvedValue({ access_token: 'fresh', expires_in: 60 })
    config.set({ tokenPath: '/t', clientId: 'c' } as any)
    api.token.set({ refresh_token: 'r', expires_in: 60, expires: Date.now() - 10_000 })
    await flush()
    expect(refreshMock).toHaveBeenCalled()
    expect(api.token().access_token).toBe('fresh')
  })

  it('preserves refresh_token when refresh response omits it', async () => {
    const api = setup()
    refreshMock.mockResolvedValue({ access_token: 'fresh', expires_in: 60 })
    config.set({ tokenPath: '/t', clientId: 'c' } as any)
    api.token.set({ refresh_token: 'keep', expires_in: 60, expires: Date.now() - 10_000 })
    await flush()
    expect(api.token().refresh_token).toBe('keep')
    expect(api.token().access_token).toBe('fresh')
  })

  describe('autoconfigOauth', () => {
    it('fetches discovery and merges endpoints when tokenPath/authorizePath missing', async () => {
      const api = setup()
      config.set({ issuerPath: 'https://idp', clientId: 'c' } as any)
      openIdConfigMock.mockResolvedValue({
        token_endpoint: 'https://idp/token',
        authorization_endpoint: 'https://idp/auth',
        revocation_endpoint: 'https://idp/revoke',
        userinfo_endpoint: 'https://idp/me',
        end_session_endpoint: 'https://idp/logout',
        jwks_uri: 'https://idp/jwks',
        code_challenge_methods_supported: ['S256']
      })
      await api.autoconfigOauth()
      const cfg = config() as any
      expect(cfg.tokenPath).toBe('https://idp/token')
      expect(cfg.authorizePath).toBe('https://idp/auth')
      expect(cfg.revokePath).toBe('https://idp/revoke')
      expect(cfg.userPath).toBe('https://idp/me')
      expect(cfg.logoutPath).toBe('https://idp/logout')
      expect(cfg.jwksUri).toBe('https://idp/jwks')
      expect(cfg.pkce).toBe(true)
      expect(cfg.scope).toBe('openid')
    })

    it('skips discovery when tokenPath already set', async () => {
      const api = setup()
      config.set({ tokenPath: '/t', clientId: 'c' } as any)
      await api.autoconfigOauth()
      expect(openIdConfigMock).not.toHaveBeenCalled()
    })

    it('skips discovery when authorizePath already set', async () => {
      const api = setup()
      config.set({ authorizePath: '/auth', clientId: 'c' } as any)
      await api.autoconfigOauth()
      expect(openIdConfigMock).not.toHaveBeenCalled()
    })

    it('preserves explicit pkce config', async () => {
      const api = setup()
      config.set({ issuerPath: 'https://idp', clientId: 'c', pkce: false } as any)
      openIdConfigMock.mockResolvedValue({
        token_endpoint: 'https://idp/token',
        code_challenge_methods_supported: ['S256']
      })
      await api.autoconfigOauth()
      expect((config() as any).pkce).toBe(false)
    })
  })
})

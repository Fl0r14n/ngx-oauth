import { TestBed } from '@angular/core/testing'
import { OAUTH_TOKEN } from './token'
import { OAUTH_REFRESH } from './functions'
import { oauthConfig, config } from './config'
import { OAuthStatus, OAuthToken } from './types'

describe('OAUTH_TOKEN', () => {
  let refreshMock: jest.Mock

  const setup = (initial?: OAuthToken) => {
    localStorage.clear()
    oauthConfig.set({ storageKey: 'token', ignorePaths: [], strictJwt: true })
    config.set(undefined as any)
    if (initial) localStorage.setItem('token', JSON.stringify(initial))
    refreshMock = jest.fn()
    TestBed.configureTestingModule({
      providers: [{ provide: OAUTH_REFRESH, useValue: refreshMock }]
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

  it('isExpiredToken', () => {
    const api = setup()
    expect(api.isExpiredToken({ expires: Date.now() - 1 })).toBe(true)
    expect(api.isExpiredToken({ expires: Date.now() + 100000 })).toBe(false)
    expect(api.isExpiredToken({})).toBe(false)
    expect(api.isExpiredToken(undefined)).toBe(false)
  })

  it('effect stamps expires when expires_in present and expires missing', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1000)
    const api = setup()
    api.token.set({ access_token: 'a', expires_in: 60 })
    TestBed.tick()
    expect(api.token().expires).toBe(1000 + 60 * 1000)
    ;(Date.now as jest.Mock).mockRestore()
  })

  it('effect calls refresh when token is expired', async () => {
    const api = setup()
    refreshMock.mockResolvedValue({ access_token: 'fresh', expires_in: 60 })
    config.set({ tokenPath: '/t', clientId: 'c' } as any)
    api.token.set({ refresh_token: 'r', expires_in: 60, expires: Date.now() - 10_000 })
    for (let i = 0; i < 20; i++) {
      await Promise.resolve()
      TestBed.tick()
    }
    expect(refreshMock).toHaveBeenCalled()
    expect(api.token().access_token).toBe('fresh')
  })
})

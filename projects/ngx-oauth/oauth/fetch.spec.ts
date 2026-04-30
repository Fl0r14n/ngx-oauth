import type { Mock } from 'vitest'
import { TestBed } from '@angular/core/testing'
import { OAUTH_FETCH } from './fetch'
import { OAUTH_TOKEN } from './token'
import { OAUTH_REFRESH } from './functions'
import { oauthConfig, config } from './config'

const flush = async () => {
  for (let i = 0; i < 20; i++) {
    await Promise.resolve()
    TestBed.tick()
  }
}

const mockJsonResponse = (status: number, body: any) => ({ status, json: () => Promise.resolve(body) }) as any

if (typeof (globalThis as any).Request === 'undefined') {
  ;(globalThis as any).Request = class {}
}

describe('OAUTH_FETCH', () => {
  let globalFetch: Mock
  let refreshMock: Mock

  const setup = () => {
    localStorage.clear()
    oauthConfig.set({ storageKey: 'token', ignorePaths: [], strictJwt: true })
    config.set({ tokenPath: '/t', clientId: 'c' } as any)
    refreshMock = vi.fn()
    globalFetch = vi.fn(() => Promise.resolve(mockJsonResponse(200, {})))
    globalThis.fetch = globalFetch
    TestBed.configureTestingModule({
      providers: [{ provide: OAUTH_REFRESH, useValue: refreshMock }]
    })
    return { fetchFn: TestBed.inject(OAUTH_FETCH), token: TestBed.inject(OAUTH_TOKEN) }
  }

  it('forwards to fetch without Authorization when no token', async () => {
    const { fetchFn } = setup()
    await fetchFn('/api')
    expect(globalFetch).toHaveBeenCalledWith('/api', undefined)
  })

  it('attaches Authorization header when authorized', async () => {
    const { fetchFn, token } = setup()
    token.token.set({ access_token: 'at', token_type: 'Bearer', expires: Date.now() + 60_000 })
    await flush()
    await fetchFn('/api')
    const init = globalFetch.mock.calls[0][1] as RequestInit
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer at')
  })

  it('sets default Content-Type when not provided', async () => {
    const { fetchFn, token } = setup()
    token.token.set({ access_token: 'at', token_type: 'Bearer', expires: Date.now() + 60_000 })
    await flush()
    await fetchFn('/api')
    const init = globalFetch.mock.calls[0][1] as RequestInit
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json')
  })

  it('refreshes before the request when token is expired', async () => {
    const { fetchFn, token } = setup()
    refreshMock.mockResolvedValue({ access_token: 'new', token_type: 'Bearer', expires_in: 60 })
    token.token.set({ access_token: 'old', token_type: 'Bearer', refresh_token: 'r', expires: Date.now() - 1 })
    await flush()
    await fetchFn('/api')
    expect(refreshMock).toHaveBeenCalled()
    const init = globalFetch.mock.calls[0][1] as RequestInit
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer new')
  })

  it('deduplicates concurrent refreshes (single-flight)', async () => {
    const { fetchFn, token } = setup()
    let resolveRefresh!: (v: any) => void
    refreshMock.mockReturnValue(new Promise(r => (resolveRefresh = r)))
    token.token.set({ access_token: 'old', token_type: 'Bearer', refresh_token: 'r', expires: Date.now() - 1 })
    await flush()
    // checkToken shares a single in-flight guard between OAUTH_TOKEN's effect
    // and OAUTH_FETCH; concurrent fetchFn calls reuse the in-flight refresh.
    const p1 = fetchFn('/a')
    const p2 = fetchFn('/b')
    const p3 = fetchFn('/c')
    await Promise.resolve()
    resolveRefresh({ access_token: 'new', token_type: 'Bearer', expires_in: 60 })
    await Promise.all([p1, p2, p3])
    expect(refreshMock.mock.calls.length).toBe(1)
  })

  it('skips ignored paths', async () => {
    localStorage.clear()
    oauthConfig.set({ storageKey: 'token', ignorePaths: [/^\/public/], strictJwt: true })
    config.set({ tokenPath: '/t', clientId: 'c' } as any)
    refreshMock = vi.fn()
    globalFetch = vi.fn(() => Promise.resolve(mockJsonResponse(200, {})))
    globalThis.fetch = globalFetch
    TestBed.configureTestingModule({ providers: [{ provide: OAUTH_REFRESH, useValue: refreshMock }] })
    const fetchFn = TestBed.inject(OAUTH_FETCH)
    const token = TestBed.inject(OAUTH_TOKEN)
    token.token.set({ access_token: 'at', token_type: 'Bearer', expires: Date.now() + 60_000 })
    await flush()
    await fetchFn('/public/stuff')
    const init = globalFetch.mock.calls[0][1]
    expect(init).toBeUndefined()
    expect(refreshMock).not.toHaveBeenCalled()
  })

  it('stores 401 response body as the token', async () => {
    const { fetchFn, token } = setup()
    token.token.set({ access_token: 'at', token_type: 'Bearer', expires: Date.now() + 60_000 })
    await flush()
    globalFetch.mockResolvedValueOnce(mockJsonResponse(401, { error: 'invalid_token' }))
    await fetchFn('/api')
    expect(token.token().error).toBe('invalid_token')
  })
})

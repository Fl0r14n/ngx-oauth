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

/** A stand-in for Response with the one behaviour that matters to OAUTH_FETCH: the body is a one-shot
 * stream. Read it twice and you get what a real Response gives you — which is how the missing clone()
 * around the 401 read stayed invisible. */
const mockJsonResponse = (status: number, body: any) => {
  let read = false
  return {
    status,
    json: () => (read ? Promise.reject(new TypeError('Body has already been read')) : ((read = true), Promise.resolve(body))),
    clone: () => mockJsonResponse(status, body)
  } as any
}

/** A 401 whose body is not JSON at all — a gateway's HTML error page, or nothing. */
const mockUnparseableResponse = (status: number) =>
  ({
    status,
    json: () => Promise.reject(new SyntaxError('Unexpected token <')),
    clone: () => mockUnparseableResponse(status)
  }) as any

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

  it('sets default Content-Type for a string body', async () => {
    const { fetchFn, token } = setup()
    token.token.set({ access_token: 'at', token_type: 'Bearer', expires: Date.now() + 60_000 })
    await flush()
    await fetchFn('/api', { method: 'POST', body: '{}' })
    const init = globalFetch.mock.calls[0][1] as RequestInit
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json')
  })

  it('sends no Content-Type on a bodyless request', async () => {
    const { fetchFn, token } = setup()
    token.token.set({ access_token: 'at', token_type: 'Bearer', expires: Date.now() + 60_000 })
    await flush()
    // the header describes a body that is not there, and a strict gateway may reject it
    await fetchFn('/api')
    const init = globalFetch.mock.calls[0][1] as RequestInit
    expect(new Headers(init.headers).get('Content-Type')).toBeNull()
  })

  it('leaves a non-string body to type itself, FormData boundary included', async () => {
    const { fetchFn, token } = setup()
    token.token.set({ access_token: 'at', token_type: 'Bearer', expires: Date.now() + 60_000 })
    await flush()
    // defaulting to JSON here would strip the multipart boundary and break the upload
    await fetchFn('/api', { method: 'POST', body: new FormData() })
    const init = globalFetch.mock.calls[0][1] as RequestInit
    expect(new Headers(init.headers).get('Content-Type')).toBeNull()
  })

  it('sets default Accept, body or not', async () => {
    const { fetchFn, token } = setup()
    token.token.set({ access_token: 'at', token_type: 'Bearer', expires: Date.now() + 60_000 })
    await flush()
    // Accept is what actually asks for JSON back — Content-Type never did
    await fetchFn('/api')
    const init = globalFetch.mock.calls[0][1] as RequestInit
    expect(new Headers(init.headers).get('Accept')).toBe('application/json')
  })

  it('does not override an Accept the caller set', async () => {
    const { fetchFn, token } = setup()
    token.token.set({ access_token: 'at', token_type: 'Bearer', expires: Date.now() + 60_000 })
    await flush()
    await fetchFn('/report.pdf', { headers: { Accept: 'application/pdf' } })
    const init = globalFetch.mock.calls[0][1] as RequestInit
    expect(new Headers(init.headers).get('Accept')).toBe('application/pdf')
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

  it('leaves the 401 body readable by the caller', async () => {
    const { fetchFn, token } = setup()
    token.token.set({ access_token: 'at', token_type: 'Bearer', expires: Date.now() + 60_000 })
    await flush()
    globalFetch.mockResolvedValueOnce(mockJsonResponse(401, { error: 'invalid_token' }))
    // storing the body must not consume it — the caller has the most reason to want a 401's body
    const response = await fetchFn('/api')
    await expect(response.json()).resolves.toEqual({ error: 'invalid_token' })
  })

  it('clears the token on a 401 with an unparseable body, without rejecting', async () => {
    const { fetchFn, token } = setup()
    token.token.set({ access_token: 'at', token_type: 'Bearer', expires: Date.now() + 60_000 })
    await flush()
    // a gateway's HTML 401: there is no error to keep, and the parse failure must not reach the caller
    globalFetch.mockResolvedValueOnce(mockUnparseableResponse(401))
    const response = await fetchFn('/api')
    expect(response.status).toBe(401)
    expect(token.token()).toEqual({})
  })
})

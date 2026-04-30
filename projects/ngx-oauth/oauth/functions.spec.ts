import type { Mock } from 'vitest'
import { TestBed } from '@angular/core/testing'
import {
  OAUTH_AUTHORIZE,
  OAUTH_CLIENT_CREDENTIAL,
  OAUTH_INTROSPECT,
  OAUTH_OPENID_CONFIG,
  OAUTH_REFRESH,
  OAUTH_RESOURCE_OWNER,
  OAUTH_REVOKE,
  OAUTH_USER_INFO
} from './functions'
import { OAuthType } from './types'

const mockJsonResponse = (body: any) => ({ json: () => Promise.resolve(body) }) as any

describe('OAuth function tokens', () => {
  let fetchMock: Mock

  beforeEach(() => {
    fetchMock = vi.fn(() => Promise.resolve(mockJsonResponse({})))
    globalThis.fetch = fetchMock
  })

  const bodyOf = (call: Mock, i = 0) => {
    const init = call.mock.calls[i][1] as RequestInit
    return new URLSearchParams(init.body as string)
  }

  describe('refresh', () => {
    it('POSTs refresh_token grant and preserves type', async () => {
      fetchMock.mockResolvedValueOnce(mockJsonResponse({ access_token: 'new' }))
      const refresh = TestBed.inject(OAUTH_REFRESH)
      const result = await refresh({ refresh_token: 'r1', type: OAuthType.AUTHORIZATION_CODE }, {
        tokenPath: '/token',
        clientId: 'c',
        clientSecret: 's',
        scope: 'openid'
      } as any)
      expect(fetchMock).toHaveBeenCalledWith('/token', expect.objectContaining({ method: 'POST' }))
      const body = bodyOf(fetchMock)
      expect(body.get('grant_type')).toBe('refresh_token')
      expect(body.get('refresh_token')).toBe('r1')
      expect(body.get('client_id')).toBe('c')
      expect(body.get('client_secret')).toBe('s')
      expect(body.get('scope')).toBe('openid')
      expect(result).toEqual({ access_token: 'new', type: OAuthType.AUTHORIZATION_CODE })
    })

    it('returns original token when refresh_token missing', async () => {
      const refresh = TestBed.inject(OAUTH_REFRESH)
      const original = { access_token: 'old' }
      const result = await refresh(original, { tokenPath: '/token', clientId: 'c' } as any)
      expect(fetchMock).not.toHaveBeenCalled()
      expect(result).toBe(original)
    })

    it('returns original token when tokenPath missing', async () => {
      const refresh = TestBed.inject(OAUTH_REFRESH)
      const original = { refresh_token: 'r' }
      const result = await refresh(original, { clientId: 'c' } as any)
      expect(fetchMock).not.toHaveBeenCalled()
      expect(result).toBe(original)
    })
  })

  describe('authorize', () => {
    it('POSTs authorization_code grant with code_verifier when present', async () => {
      fetchMock.mockResolvedValueOnce(mockJsonResponse({ access_token: 'ok', id_token: 'id' }))
      const authorize = TestBed.inject(OAUTH_AUTHORIZE)
      const result = await authorize({ code: 'abc', redirect_uri: 'https://app/cb', code_verifier: 'v' }, {
        tokenPath: '/t',
        clientId: 'c',
        clientSecret: 's',
        scope: 'openid'
      } as any)
      const body = bodyOf(fetchMock)
      expect(body.get('grant_type')).toBe('authorization_code')
      expect(body.get('code')).toBe('abc')
      expect(body.get('redirect_uri')).toBe('https://app/cb')
      expect(body.get('code_verifier')).toBe('v')
      expect(body.get('client_secret')).toBe('s')
      expect(result).toEqual({ access_token: 'ok', id_token: 'id', type: OAuthType.AUTHORIZATION_CODE })
    })

    it('returns original token when code missing', async () => {
      const authorize = TestBed.inject(OAUTH_AUTHORIZE)
      const original = { redirect_uri: 'x' }
      const result = await authorize(original, { tokenPath: '/t', clientId: 'c' } as any)
      expect(fetchMock).not.toHaveBeenCalled()
      expect(result).toBe(original)
    })
  })

  describe('clientCredentialLogin', () => {
    it('POSTs client_credentials grant', async () => {
      fetchMock.mockResolvedValueOnce(mockJsonResponse({ access_token: 'cc' }))
      const login = TestBed.inject(OAUTH_CLIENT_CREDENTIAL)
      const result = await login({ tokenPath: '/t', clientId: 'c', clientSecret: 's', scope: 'api' } as any)
      const body = bodyOf(fetchMock)
      expect(body.get('grant_type')).toBe(OAuthType.CLIENT_CREDENTIAL)
      expect(body.get('client_id')).toBe('c')
      expect(body.get('client_secret')).toBe('s')
      expect(body.get('scope')).toBe('api')
      expect(result).toEqual({ access_token: 'cc', type: OAuthType.CLIENT_CREDENTIAL })
    })

    it('returns undefined when tokenPath missing', async () => {
      const login = TestBed.inject(OAUTH_CLIENT_CREDENTIAL)
      expect(await login({ clientId: 'c', clientSecret: 's' } as any)).toBeUndefined()
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('resourceOwnerLogin', () => {
    it('POSTs password grant', async () => {
      fetchMock.mockResolvedValueOnce(mockJsonResponse({ access_token: 'ro' }))
      const login = TestBed.inject(OAUTH_RESOURCE_OWNER)
      const result = await login({ username: 'u', password: 'p' }, { tokenPath: '/t', clientId: 'c' } as any)
      const body = bodyOf(fetchMock)
      expect(body.get('grant_type')).toBe(OAuthType.RESOURCE)
      expect(body.get('username')).toBe('u')
      expect(body.get('password')).toBe('p')
      expect(result).toEqual({ access_token: 'ro', type: OAuthType.RESOURCE })
    })

    it('returns undefined when clientId missing', async () => {
      const login = TestBed.inject(OAUTH_RESOURCE_OWNER)
      expect(await login({ username: 'u', password: 'p' }, { tokenPath: '/t' } as any)).toBeUndefined()
    })
  })

  describe('revoke', () => {
    it('POSTs both access and refresh tokens', async () => {
      const revoke = TestBed.inject(OAUTH_REVOKE)
      await revoke({ access_token: 'a', refresh_token: 'r' }, { revokePath: '/revoke', clientId: 'c', clientSecret: 's' } as any)
      expect(fetchMock).toHaveBeenCalledTimes(2)
      const accessBody = bodyOf(fetchMock, 0)
      expect(accessBody.get('token')).toBe('a')
      expect(accessBody.get('token_type_hint')).toBe('access_token')
      const refreshBody = bodyOf(fetchMock, 1)
      expect(refreshBody.get('token')).toBe('r')
      expect(refreshBody.get('token_type_hint')).toBe('refresh_token')
    })

    it('does nothing when revokePath missing', async () => {
      const revoke = TestBed.inject(OAUTH_REVOKE)
      await revoke({ access_token: 'a' }, { clientId: 'c' } as any)
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('openIdConfiguration', () => {
    it('GETs .well-known endpoint', async () => {
      fetchMock.mockResolvedValueOnce(mockJsonResponse({ issuer: 'https://idp' }))
      const fn = TestBed.inject(OAUTH_OPENID_CONFIG)
      const result = await fn({ issuerPath: 'https://idp', clientId: 'c' } as any)
      expect(fetchMock).toHaveBeenCalledWith('https://idp/.well-known/openid-configuration?client_id=c')
      expect(result).toEqual({ issuer: 'https://idp' })
    })

    it('returns undefined when issuerPath missing', async () => {
      const fn = TestBed.inject(OAUTH_OPENID_CONFIG)
      expect(await fn({} as any)).toBeUndefined()
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('userInfo', () => {
    it('GETs userPath via provided fetchFn', async () => {
      const customFetch = vi.fn().mockResolvedValue(mockJsonResponse({ sub: 'u1' }))
      const fn = TestBed.inject(OAUTH_USER_INFO)
      const result = await fn({ userPath: '/me' } as any, customFetch)
      expect(customFetch).toHaveBeenCalledWith('/me')
      expect(result).toEqual({ sub: 'u1' })
    })
  })

  describe('introspect', () => {
    it('POSTs with Basic auth header and token body', async () => {
      fetchMock.mockResolvedValueOnce(mockJsonResponse({ active: true }))
      const fn = TestBed.inject(OAUTH_INTROSPECT)
      await fn({ access_token: 'at' }, { introspectionPath: '/introspect', clientId: 'c', clientSecret: 's' } as any)
      const init = fetchMock.mock.calls[0][1] as RequestInit
      expect((init.headers as any).Authorization).toBe(`Basic ${btoa('c:s')}`)
      expect(new URLSearchParams(init.body as string).get('token')).toBe('at')
    })

    it('returns undefined when required params missing', async () => {
      const fn = TestBed.inject(OAUTH_INTROSPECT)
      expect(await fn({}, {} as any)).toBeUndefined()
    })
  })
})

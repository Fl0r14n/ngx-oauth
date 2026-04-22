import { inject, InjectionToken, resource } from '@angular/core'
import { config } from './config'
import { OAUTH_FETCH } from './fetch'
import { OAUTH_USER_INFO } from './functions'
import { OAUTH_VERIFY_JWT } from './jwt'
import { isAuthorized, token } from './token'
import { OpenIdConfig, UserInfo } from './types'

export const OAUTH_USER = new InjectionToken('OAUTH_USER', {
  providedIn: 'root',
  factory: () => {
    const verifyJwtFn = inject(OAUTH_VERIFY_JWT)
    const userInfoFn = inject(OAUTH_USER_INFO)
    const fetchFn = inject(OAUTH_FETCH)
    return resource<UserInfo | undefined, { idToken?: string; authorized: boolean; userPath?: string }>({
      params: () => ({
        idToken: token().id_token,
        authorized: isAuthorized(),
        userPath: (config() as OpenIdConfig)?.userPath
      }),
      loader: async ({ params: { idToken, authorized, userPath } }) => {
        if (idToken) return verifyJwtFn(idToken)
        if (authorized && userPath) return userInfoFn({ userPath } as OpenIdConfig, fetchFn)
        return undefined
      }
    })
  }
})

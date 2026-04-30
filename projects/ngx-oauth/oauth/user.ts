import { inject, InjectionToken, resource } from '@angular/core'
import { config } from './config'
import { OAUTH_FETCH } from './fetch'
import { OAUTH_VERIFY_JWT } from './jwt'
import { OAUTH_TOKEN } from './token'
import { UserInfo } from './types'
import { OAUTH_USER_INFO } from './functions'

export const OAUTH_USER = new InjectionToken('OAUTH_USER', {
  providedIn: 'root',
  factory: () => {
    const { token, isAuthorized, autoconfigOauth } = inject(OAUTH_TOKEN)
    const verifyJwt = inject(OAUTH_VERIFY_JWT)
    const userInfo = inject(OAUTH_USER_INFO)
    const fetch = inject(OAUTH_FETCH)
    return resource<UserInfo | undefined, { idToken?: string; authorized: boolean; userPath?: string }>({
      params: () => ({
        idToken: token().id_token,
        authorized: isAuthorized(),
        userPath: config()?.userPath
      }),
      loader: async ({ params: { idToken, authorized, userPath } }) => {
        if (idToken) return verifyJwt(idToken)
        if (authorized && userPath) {
          await autoconfigOauth()
          return userInfo({ userPath }, fetch)
        }
        return undefined
      }
    })
  }
})

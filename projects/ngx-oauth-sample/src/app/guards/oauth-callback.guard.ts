import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { OAUTH } from 'ngx-oauth'

export const oauthCallbackGuard: CanActivateFn = async (_route, state) => {
  const oauth = inject(OAUTH)
  const router = inject(Router)
  const url = new URL(`app:${state.url}`)
  await oauth.oauthCallback(url.toString())
  const returnUrl = url.searchParams.get('next') ?? '/'
  return router.parseUrl(returnUrl)
}

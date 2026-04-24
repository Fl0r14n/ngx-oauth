import { Observable } from 'rxjs'
import { InjectionToken } from '@angular/core'

export type ProfileService = {
  readonly profileName$: Observable<string | undefined>
}

export const PROFILE_SERVICE = new InjectionToken<ProfileService>('ProfileService')

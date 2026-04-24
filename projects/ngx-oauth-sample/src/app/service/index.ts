import { InjectionToken, Signal } from '@angular/core'

export type ProfileService = {
  readonly profileName: Signal<string | undefined>
}

export const PROFILE_SERVICE = new InjectionToken<ProfileService>('ProfileService')

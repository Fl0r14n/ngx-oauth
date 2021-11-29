import {Observable} from 'rxjs';
import {InjectionToken} from '@angular/core';

export interface ProfileService {
  get profileName$(): Observable<string | undefined>;
}

export const PROFILE_SERVICE = new InjectionToken<ProfileService>('ProfileService');

import {Component, Inject} from '@angular/core';
import {OAuthService} from 'ngx-oauth';
import {Observable} from 'rxjs';
import {PROFILE_SERVICE, ProfileService} from './service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {

  private _state = 'some_salt_dummy_state';
  status$ = this.oauthService.status$;

  constructor(private oauthService: OAuthService,
              @Inject(PROFILE_SERVICE) private profileService: ProfileService) {
  }

  i18n = {
    username: 'Username'
  };

  get state(): string {
    return this._state;
  }

  set state(value: string) {
    this._state = value;
  }

  get profileName$(): Observable<string | undefined> | undefined {
    return this.profileService.profileName$;
  }
}

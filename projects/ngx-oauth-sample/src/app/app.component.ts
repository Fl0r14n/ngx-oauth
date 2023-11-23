import {Component, Inject} from '@angular/core';
import {OAuthLoginComponent, OAuthService, OAuthType} from 'ngx-oauth';
import {Observable} from 'rxjs';
import {PROFILE_SERVICE, ProfileService} from './service';
import {CommonModule} from '@angular/common';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    OAuthLoginComponent
  ],
  template: `
    <header>
      <nav class="navbar navbar-light bg-light container-fluid px-3">
        <a class="navbar-brand">OAuth Demo</a>
        <ul class="nav">
          <li class="nav-item">
            <oauth-login [type]="type"
                         [profileName$]="profileName$"
                         [i18n]="i18n"
                         [useLogoutUrl]="useLogoutUrl"
                         [(state)]="state"></oauth-login>
          </li>
        </ul>
      </nav>
      <div class="alert alert-info text-center font-weight-bold"
           *ngIf="status$ | async as status">{{status}}</div>
    </header>
    <button class="btn btn-primary" (click)="refresh()">Refresh profile</button>
  `
})
export class AppComponent {

  private _state = 'some_salt_dummy_state';
  useLogoutUrl = true;
  status$ = this.oauthService.status$;
  type = OAuthType.AUTHORIZATION_CODE;

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

  refresh() {
    //test expired token
    this.oauthService.getUserInfo().subscribe();
  }
}

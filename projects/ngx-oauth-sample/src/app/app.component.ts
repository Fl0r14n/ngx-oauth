import {Component} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {map} from 'rxjs/operators';
import {OAuthService, OAuthStatus, OAuthType} from 'ngx-oauth';
import {Observable, of} from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {

  private _state: string;
  status$: Observable<OAuthStatus>;

  constructor(private http: HttpClient,
              private oauthService: OAuthService) {
    this.status$ = this.oauthService.status$;
    this.state = 'some_salt_dummy_state';
    // this.oauthService.ignorePaths.push(/.+(users\/current)?.+/);
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

  // scope = 'basic';

  scope = 'read';

  get profileName$(): Observable<string> {
    return of('User');
    // const user = this.oauthService.type === OAuthType.CLIENT_CREDENTIAL ? 'anonymous' : 'current';
    // return this.http.get<any>(`/occ/v2/electronics/users/${user}`).pipe(
    //   map(v => v.name)
    // );
  }
}

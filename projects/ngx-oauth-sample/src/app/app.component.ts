import {Component} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {filter, map} from 'rxjs/operators';
import {OAuthService, OAuthStatus} from 'ngx-oauth';
import {Observable} from 'rxjs';

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

  get profileName$(): Observable<string> {
    return this.status$.pipe(
      filter(s => s === OAuthStatus.AUTHORIZED),
      map(() => this.oauthService.token.id_token),
      filter(t => !!t),
      map(t => JSON.parse(atob(t.split('.')[1]))),
      map(t => t.name)
    );
    // return of('User');
    // const user = this.oauthService.type === OAuthType.CLIENT_CREDENTIAL ? 'anonymous' : 'current';
    // return this.http.get<any>(`/occ/v2/electronics/users/${user}`).pipe(
    //   map(v => v.name)
    // );
  }
}

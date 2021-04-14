import {Component} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {filter, map, tap} from 'rxjs/operators';
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
      map(t => t.name || t.username || t.email || t.sub)
    );
  }
}

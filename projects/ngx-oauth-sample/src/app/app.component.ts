import {Component} from '@angular/core';
import {filter, map, tap} from 'rxjs/operators';
import {OAuthService, OAuthStatus} from 'ngx-oauth';
import {Observable} from 'rxjs';
import {IntrospectService} from './introspect.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {

  private _state = 'some_salt_dummy_state';
  status$ = this.oauthService.status$;

  constructor(private oauthService: OAuthService,
              private introspectService: IntrospectService) {
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
      map(() => this.oauthService.token?.id_token),
      filter(t => !!t),
      // @ts-ignore
      map(t => JSON.parse(atob(t.split('.')[1]))),
      tap(v => console.log(v)),
      map(t => t.name || t.username || t.email || t.sub),
      tap(() => this.introspectService.introspect().subscribe(v => console.log(v)))
    );
  }
}

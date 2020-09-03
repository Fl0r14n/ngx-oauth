import {Component} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {map} from 'rxjs/operators';
import {OAuthService, OAuthStatus, OAuthType} from 'ngx-oauth';
import {Observable} from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {

  status$: Observable<OAuthStatus>;

  constructor(private http: HttpClient,
              private oauthService: OAuthService) {
    this.status$ = this.oauthService.status$;
    // this.oauthService.ignorePaths.push(/.+(users\/current)?.+/);
  }

  i18n = {
    username: 'Email'
  };

  getProfileName = () => {
    const user = this.oauthService.type === OAuthType.CLIENT_CREDENTIAL ? 'anonymous' : 'current';
    return this.http.get<any>(`/occ/v2/electronics/users/${user}`).pipe(
      map(v => v.name)
    );
  };
}

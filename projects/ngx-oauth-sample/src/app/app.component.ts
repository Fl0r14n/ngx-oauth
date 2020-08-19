import {Component} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {map} from 'rxjs/operators';
import {OAuthService, OAuthType} from 'ngx-oauth';
import {of} from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {

  constructor(private http: HttpClient,
              private oauthService: OAuthService) {
  }

  i18n = {
    username: 'Email'
  };

  getProfileName = () => {
    if (this.oauthService.type === OAuthType.CLIENT_CREDENTIAL) {
      return of('Guest');
    } else {
      return this.http.get<any>('/occ/v2/electronics/users/current').pipe(
        map(v => v.name)
      );
    }
  };
}

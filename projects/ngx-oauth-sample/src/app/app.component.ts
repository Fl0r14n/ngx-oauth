import {Component} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {map} from 'rxjs/operators';
import {OAuthService, OAuthType} from 'ngx-oauth';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {

  constructor(private http: HttpClient,
              private oauthService: OAuthService) {
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

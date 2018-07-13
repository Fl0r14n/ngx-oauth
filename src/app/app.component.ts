import {Component} from '@angular/core';

import '../style/app.scss';
import {ResourceOAuthConfig} from './oauth';

export class ResourceOAuthSettings implements ResourceOAuthConfig {
  tokenPath = 'authorizationserver/oauth/token';
  profileUri = 'rest/v2/user/current';
  clientId = 'client-side';
  clientSecret = 'secret';
  username = '';
  password = '';
  storage = localStorage;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent extends ResourceOAuthSettings {

  constructor() {
    super()
  }
}

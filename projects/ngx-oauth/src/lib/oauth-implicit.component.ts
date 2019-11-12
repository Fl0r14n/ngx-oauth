import {Component, Input} from '@angular/core';
import {OAuthComponent} from './oauth.component';
import {OAuthService} from './oauth.service';
import {ImplicitOAuthConfig} from './oauth.config';

@Component({
  selector: 'oauth-implicit',
  template: `
    <a href="#" class="oauth {{className}}">
      <span *ngIf="isLogout()" (click)="oauth.login()">{{i18nLogin}}</span>
      <span *ngIf="isAuthorized()" (click)="oauth.logout()">{{i18nLogout}}&nbsp;<strong>{{getEmail()}}</strong></span>
      <span *ngIf="isDenied()" (click)="oauth.login()">{{i18nDenied}}</span>
    </a>
  `
})
export class ImplicitOAuthComponent extends OAuthComponent {

  constructor(oauth: OAuthService) {
    super(oauth);
  }

  @Input()
  set oauthConfig(oauthConfig: ImplicitOAuthConfig) {
    this.oauth.configure(oauthConfig);
  }
}

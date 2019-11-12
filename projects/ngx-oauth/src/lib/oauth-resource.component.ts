import {Component, HostListener, Input} from '@angular/core';
import {OAuthComponent} from './oauth.component';
import {OAuthEvent, OAuthService} from './oauth.service';
import {ResourceOAuthConfig} from './oauth.config';

@Component({
  selector: 'oauth-resource',
  template: `
    <div class="oauth dropdown text-right p-3 {{collapse?'show':''}} {{className}}">
      <button class="btn btn-link p-0 dropdown-toogle" [innerHtml]="getText()"
              (click)="isAuthorized() ? this.oauth.logout() :collapse = !collapse"></button>
      <div class="dropdown-menu mr-3 {{collapse?'show':''}}">
        <form class="p-3" *ngIf="isLogout() || isDenied()" (submit)="oauth.login(); collapse=false;">
          <div class="form-group">
            <input type="text" class="form-control" name="username" required [(ngModel)]="oauth.username" [placeholder]="i18Username">
          </div>
          <div class="form-group">
            <input type="password" class="form-control" name="password" required [(ngModel)]="oauth.password" [placeholder]="i18Password">
          </div>
          <div class="text-right">
            <button type="submit" class="btn btn-primary">{{i18nLogin}}</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .oauth .dropdown-menu {
      left: auto;
      right: 0;
      box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
      min-width: 250px;
    }

    .oauth .dropdown-menu:before {
      content: '';
      display: inline-block;
      border-left: 7px solid transparent;
      border-right: 7px solid transparent;
      border-bottom: 7px solid #ccc;
      border-bottom-color: rgba(0, 0, 0, 0.2);
      position: absolute;
      top: -7px;
      left: auto;
      right: 15px;
    }

    .oauth .dropdown-menu:after {
      content: '';
      display: inline-block;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-bottom: 6px solid #ffffff;
      position: absolute;
      top: -6px;
      left: auto;
      right: 16px;
    }
  `]
})
export class ResourceOAuthComponent extends OAuthComponent {

  @Input()
  i18Username = 'Username';
  @Input()
  i18Password = 'Password';
  collapse = false;

  constructor(oauth: OAuthService) {
    super(oauth);
  }

  @Input()
  set oauthConfig(oauthConfig: ResourceOAuthConfig) {
    this.oauth.configure(oauthConfig);
  }

  getText() {
    switch (this.oauth.status) {
      case OAuthEvent.LOGOUT:
        return this.i18nLogin;
      case OAuthEvent.AUTHORIZED:
        return `${this.i18nLogout}&nbsp;<strong>${this.getEmail()}</strong>`;
      case OAuthEvent.DENIED:
        return this.i18nDenied;
    }
  }

  @HostListener('window:keyup', ['$event'])
  keyboardEvent(event: KeyboardEvent) {
    if (event.keyCode === 27) {
      this.collapse = false;
    }
  }
}

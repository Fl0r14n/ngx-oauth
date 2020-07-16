import {Component, HostListener, Input, OnInit} from '@angular/core';
import {OAuthService} from '../../oauth.service';
import {Observable} from 'rxjs';
import {OAuthFlows, OAuthStatusTypes} from '../../oauth.config';
import {map} from 'rxjs/operators';

@Component({
  selector: 'oauth-login',
  templateUrl: 'oauth-login.component.html',
  styleUrls: ['oauth-login.component.scss']
})
export class OauthLoginComponent implements OnInit {
  @Input()
  loginText = 'Sign In';
  @Input()
  logoutText = 'Logout';
  @Input()
  loginErrorText = 'Access Denied. Try again';
  @Input()
  usernameText = 'Username';
  @Input()
  passwordText = 'Password';
  @Input()
  name: string;
  status$: Observable<OAuthStatusTypes>;
  flowType: OAuthFlows;
  collapse = false;
  buttonText$: Observable<string>;
  username: string;
  password: string;
  StatusTypes = OAuthStatusTypes;
  FlowTypes = OAuthFlows;
  location = window.location.href;
  constructor(private readonly oauthService: OAuthService) {}

  ngOnInit() {
    this.status$ = this.oauthService.getStatus();
    this.flowType = this.oauthService.getCurrentFlow();
    this.buttonText$ = this.status$.pipe(
      map((status) => {
        switch (status) {
          case OAuthStatusTypes.NOT_AUTHORIZED:
            return this.loginText;
          case OAuthStatusTypes.AUTHORIZED:
            return `${this.logoutText}&nbsp;<strong>${this.name || ''}</strong>`;
          case OAuthStatusTypes.DENIED:
            return this.loginErrorText;
        }
      })
    );
  }

  logout() {
    this.oauthService.logout();
  }

  login(parameters) {
    this.oauthService.login(parameters);
    this.collapse = false;
  }

  toggleCollapse() {
    this.collapse = !this.collapse;
  }

  @HostListener('window:keyup', ['$event'])
  keyboardEvent(event: KeyboardEvent) {
    if (event.keyCode === 27) {
      this.collapse = false;
    }
  }
}

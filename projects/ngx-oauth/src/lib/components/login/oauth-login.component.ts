import {Component, ContentChild, HostListener, Input, OnInit, TemplateRef} from '@angular/core';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {OAuthFlows, OAuthStatusTypes} from '../../models';
import {OAuthService} from '../../services';

@Component({
  selector: 'oauth-login',
  templateUrl: 'oauth-login.component.html',
  styleUrls: ['oauth-login.component.scss']
})
export class OauthLoginComponent implements OnInit {

  @Input()
  name: string;
  @ContentChild('login', {static: false})
  loginTemplate: TemplateRef<any>;

  status$: Observable<OAuthStatusTypes>;
  flowType: OAuthFlows;
  collapse = false;
  buttonText$: Observable<string>;
  username: string;
  password: string;
  StatusTypes = OAuthStatusTypes;
  FlowTypes = OAuthFlows;
  location = window.location.href;
  loginFunction = (p) => this.login(p);
  logoutFunction = () => this.logout();

  constructor(private readonly oauthService: OAuthService) {
  }

  ngOnInit() {
    this.status$ = this.oauthService.getStatus();
    this.flowType = this.oauthService.getCurrentFlow();
    this.buttonText$ = this.status$.pipe(
      map((status) => {
        switch (status) {
          case OAuthStatusTypes.NOT_AUTHORIZED:
            return 'Sign In';
          case OAuthStatusTypes.AUTHORIZED:
            return `Logout&nbsp;<strong>${this.name || ''}</strong>`;
          case OAuthStatusTypes.DENIED:
            return 'Access Denied. Try again';
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

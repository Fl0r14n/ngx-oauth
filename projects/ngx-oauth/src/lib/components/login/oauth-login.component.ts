import {Component, ContentChild, HostListener, Input, OnInit, TemplateRef} from '@angular/core';
import {Observable} from 'rxjs';
import {OAuthType, OAuthStatus} from '../../models';
import {OAuthService} from '../../services';

@Component({
  selector: 'oauth-login',
  templateUrl: 'oauth-login.component.html',
  styleUrls: ['oauth-login.component.scss']
})
export class OauthLoginComponent implements OnInit {

  @Input()
  getProfileName: () => Observable<string>;
  @ContentChild('login', {static: false})
  loginTemplate: TemplateRef<any>;

  status$: Observable<OAuthStatus>;
  type: OAuthType;
  collapse = false;
  username: string;
  password: string;
  StatusTypes = OAuthStatus;
  FlowTypes = OAuthType;
  location = window.location.href;
  loginFunction = (p) => this.login(p);
  logoutFunction = () => this.logout();

  constructor(private readonly oauthService: OAuthService) {
  }

  ngOnInit() {
    this.status$ = this.oauthService.status$;
    this.type = this.oauthService.type;
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

import {Component, HostListener, Input} from '@angular/core';
import {Observable} from 'rxjs';
import {map, tap} from 'rxjs/operators';
import {OAuthService, OAuthStatusTypes} from 'ngx-oauth';

@Component({
  selector: 'app-oauth-resource',
  templateUrl: 'oauth-resource.component.html',
  styleUrls: ['oauth-resource.component.scss']
})
export class OAuthResourceComponent {
  collapse = false;
  status$: Observable<OAuthStatusTypes>;
  statusTypes = OAuthStatusTypes;
  buttonText$: Observable<string>;
  username: string;
  password: string;

  constructor(public oauth: OAuthService) {
    this.status$ = this.oauth.getStatus();
    this.buttonText$ = this.status$.pipe(
      map((status) => {
        switch (status) {
          case OAuthStatusTypes.NOT_AUTHORIZED:
            return 'Sign in';
          case OAuthStatusTypes.AUTHORIZED:
            return `Logout&nbsp;<strong>${this.username}</strong>`;
          case OAuthStatusTypes.DENIED:
            return 'Access denied. Try Again';
        }
      })
    );
  }

  buttonClick(status: OAuthStatusTypes) {
    if (status === OAuthStatusTypes.AUTHORIZED) {
      this.oauth.logout();
    } else {
      this.collapse = !this.collapse;
    }
  }

  login() {
    this.oauth.login({
      username: this.username,
      password: this.password
    });
    this.collapse = false;
  }

  @HostListener('window:keyup', ['$event'])
  keyboardEvent(event: KeyboardEvent) {
    if (event.keyCode === 27) {
      this.collapse = false;
    }
  }
}

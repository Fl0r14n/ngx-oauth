import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {OAuthService} from 'ngx-oauth';

/**
 * OAuth token introspection service for keycloak
 */
@Injectable({
  providedIn: 'root'
})
export class IntrospectService {

  introspectPath = '/auth/realms/commerce/protocol/openid-connect/token/introspect';
  clientId = 'hybris';
  clientSecret = '2519368d-8c92-44c9-ba4c-5f3763bc38c9';

  constructor(private http: HttpClient,
              private oauthService: OAuthService) {
    this.oauthService.ignorePaths.push(new RegExp(this.introspectPath));
  }

  introspect() {
    const token = this.oauthService.token?.access_token;
    const body = new URLSearchParams();
    body.set('token', token || '');
    return this.http.post(this.introspectPath, body.toString(), {
      headers: new HttpHeaders({
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + btoa(`${this.clientId}:${this.clientSecret}`)
      })
    });
  }
}

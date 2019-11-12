import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {FormsModule} from '@angular/forms';
import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';
import {RouterModule} from '@angular/router';
import {ImplicitOAuthComponent} from './oauth-implicit.component';
import {ResourceOAuthComponent} from './oauth-resource.component';
import {OAuthService} from './oauth.service';
import {OAuthInterceptor} from './oauth.interceptor';

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    RouterModule
  ],
  declarations: [
    ImplicitOAuthComponent,
    ResourceOAuthComponent
  ],
  exports: [
    ImplicitOAuthComponent,
    ResourceOAuthComponent
  ],
  providers: [
    OAuthService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: OAuthInterceptor,
      multi: true,
    }
  ]
})
export class OAuthModule {
}

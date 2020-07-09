import {ModuleWithProviders, NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {FormsModule} from '@angular/forms';
import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';
import {RouterModule} from '@angular/router';
import {OAuthService} from './oauth.service';
import {OAuthInterceptor} from './oauth.interceptor';
import {OAuthConfig, OAuthConfigService} from './oauth.config';

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    RouterModule
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
  static forRoot(config: OAuthConfig): ModuleWithProviders {
    return {
      ngModule: OAuthModule,
      providers: [
        OAuthService,
        {
          provide: HTTP_INTERCEPTORS,
          useClass: OAuthInterceptor,
          multi: true,
        },
        {
          provide: OAuthConfigService,
          useValue: config
        }
      ]
    };
  }
}

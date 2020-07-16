## Angular OAuth

Ngx-oauth is an angular library for OAuth 2.0 login, the library supports all the 4 flows: resource, implicit, authorization code and client credentials.

### How to

To start using the ngx-oauth you need to import and configure the ngx-oauth module.

Example: 
```typescript
const resourceFlowConfig = {
  flowType: OAuthFlows.RESOURCE,
  flowConfig: {
    tokenPath: 'authorizationserver/oauth/token',
    clientSecret: 'secret',
    clientId: 'client-side'
  },
  storage: localStorage,
  storageKey: 'token'
};


@NgModule({
  imports: [
    OAuthModule.forRoot(resourceFlowConfig),
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
``` 

You can use the ngx-login component

```angular2html
<div class="login-component">
  <oauth-login></oauth-login>
</div>  
```
or create your custom login template using OAuthService

```angular2html
<form (submit)="oauthService.login()">
  <div class="card">
    <div class="card-header text-center">
      <h2 class="m-0 p-3">
        <strong>Login</strong>
      </h2>
    </div>
    <div class="card-body">
      <div class="form-group">
        <input type="text" class="form-control" name="username" required [(ngModel)]="oauthService.username"
               placeholder="username">
      </div>
      <div class="form-group">
        <input type="password" class="form-control" name="password" required [(ngModel)]="oauthService.password"
               placeholder="password">
      </div>
    </div>
    <div class="card-footer">
      <div class="text-center">
        <button type="submit" class="btn btn-primary">Submit</button>
      </div>
    </div>
  </div>
</form>
```

and import OAuthService in your login component constructor

## Installing:
```
npm install ngx-oauth --save
```

Import ```OAuthModule``` in your angular app

## App Requirements
* none
 
##Running the demo

* change proxy context in ```proxy.conf.js``` so that webpack forwards your request to your oauth server
* in app.component.ts add your **clientId, secret**, oauth server **token enpoint** and user **profile endpoint**
* npm install
* npm start
 
#### Licensing
MIT License


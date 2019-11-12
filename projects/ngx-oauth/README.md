## Angular OAuth

OAuth client for angular which supports resource and implicit flows

### How to
```angular2html
<div class="login-component">
  <oauth-implicit [oauthConfig]="this"></oauth-implicit>
</div>  
```
where

```typescript
export class ImplicitOauthSettings implements ImplicitOAuthConfig {
  authorizePath = '/oauth/authorize';
  profileUri = '/rest/v1/users/current';
  clientId = 'clientID';
  scope = 'basic';
}

@Component({
  selector: 'my-login',
  templateUrl: 'login.component.html',
  styleUrls: ['login.component.scss']
})
export class LoginComponent extends ImplicitOauthSettings {

  constructor() {
    super()
  }
}
```

**or**

```angular2html
<div class="login-component">
  <oauth-resource [oauthConfig]="this"></oauth-resource>
</div>
```

where

```typescript
export class ResourceOAuthSettings implements ResourceOAuthConfig {
  tokenPath = '/oauth/token';
  profileUri = '/rest/v1/users/current';
  clientId = 'clientID';
  clientSecret = 'secret';
  username = 'username';
  password = 'password';
}

@Component({
  selector: 'my-login',
  templateUrl: 'login.component.html',
  styleUrls: ['login.component.scss']
})
export class LoginComponent extends ResourceOAuthSettings {

  constructor() {
    super()
  }
}
```

**or create your custom login template using OAuthService**

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
 
#### Licensing
MIT License

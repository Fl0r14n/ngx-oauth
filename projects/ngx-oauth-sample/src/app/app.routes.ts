import { Routes } from '@angular/router'
import { oauthCallbackGuard } from './guards'

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/main.page').then(m => m.MainPage) },
  { path: 'oauth_callback', canActivate: [oauthCallbackGuard], children: [] },
  { path: '**', redirectTo: '' }
]

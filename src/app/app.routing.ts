import {Component, NgModule} from '@angular/core';
import {AppComponent} from './app.component';
import {RouterModule, Routes} from '@angular/router';

@Component({
  template: `
    <h2>Page not found</h2>
  `
})
export class PageNotFoundComponent {
}

const routes: Routes = [
  {
    path: '',
    component: AppComponent
  },
  {
    path: '**',
    component: PageNotFoundComponent
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes)
  ],
  declarations: [
    PageNotFoundComponent
  ],
  exports: [
    RouterModule
  ],
})
export class AppRoutingModule {
}

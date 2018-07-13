import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

// webpack DefinePlugin
declare const PRODUCTION;
declare const BUILDTIMESTAMP;

if (PRODUCTION) {
  console.log('PROD mode');
  enableProdMode();
} else {
  console.log('DEV mode');
}
console.log('Built at:', new Date(BUILDTIMESTAMP));

const main = () => {
  platformBrowserDynamic().bootstrapModule(AppModule);
};

if (document.readyState === 'complete') {
  main();
} else {
  document.addEventListener('DOMContentLoaded', main);
}

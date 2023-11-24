import {inject, Injectable} from '@angular/core';
import {HttpBackend, HttpClient} from '@angular/common/http';

@Injectable({
  providedIn: 'root',
  useFactory: () => new HttpClient(inject(HttpBackend)),
})
export abstract class OAuthHttpClient extends HttpClient {
}

import {Component} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {map} from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {

  constructor(private http: HttpClient) {
  }

  i18n = {
    username: 'Email'
  };

  getProfileName = () => {
    return this.http.get<any>('/occ/v2/electronics/users/current').pipe(
      map(v => v.name)
    );
  };
}

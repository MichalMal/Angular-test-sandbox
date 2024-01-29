import { Component } from '@angular/core';
import { AppComponent } from 'src/app/app.component';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  constructor (public app: AppComponent) {
    this.app.routing.subscribe((value) => {
      this.isCollapsed = value;
    }); 
   }
  public isCollapsed = true;

}

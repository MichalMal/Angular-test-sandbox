import { Component, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Angular-test-sandbox';
  Collapsed = true;
  public routing: EventEmitter<boolean> = new EventEmitter<boolean>();
  
  changeOfRoutes() {
    this.routing.emit(true);
  }
}

// core modules
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

// libraries 
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgChartsModule } from 'ng2-charts';

// components
import { JubotronComponent } from './components/jubotron/jubotron.component';
import { NavbarComponent } from './shared/navbar/navbar.component';

// pages
import { HomeComponent } from './pages/home/home.component';
import { ContactUsComponent } from './pages/contact-us/contact-us.component';
import { EcgDataDisplayComponent } from './pages/ecg-data-display/ecg-data-display.component';

// services
import { EdfParserService } from './services/edf-parser.service';
import { EdfDataService } from './services/edf-data.service';

@NgModule({
  declarations: [
    AppComponent,
    JubotronComponent,
    NavbarComponent,
    HomeComponent,
    ContactUsComponent,
    EcgDataDisplayComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgbModule,
    NgChartsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }

// core modules
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

// libraries 
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgChartsModule } from 'ng2-charts';
import { ToastrModule } from 'ngx-toastr';

// components
import { JubotronComponent } from './components/jubotron/jubotron.component';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { TimeScaleComponent } from './components/time-scale/time-scale.component';
import { QtChartComponent } from './components/qt-chart/qt-chart.component';

// pages
import { HomeComponent } from './pages/home/home.component';
import { ContactUsComponent } from './pages/contact-us/contact-us.component';
import { EcgDataDisplayComponent } from './pages/ecg-data-display/ecg-data-display.component';


@NgModule({
  declarations: [
    AppComponent,
    JubotronComponent,
    NavbarComponent,
    HomeComponent,
    ContactUsComponent,
    EcgDataDisplayComponent,
    TimeScaleComponent,
    QtChartComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    ToastrModule.forRoot({
      timeOut: 3000,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
    }), 
    HttpClientModule,
    AppRoutingModule,
    NgbModule,
    FormsModule,
    NgChartsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }

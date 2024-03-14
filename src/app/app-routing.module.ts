import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomeComponent } from './pages/home/home.component';
import { ContactUsComponent } from './pages/contact-us/contact-us.component';
import { EcgDataDisplayComponent } from './pages/ecg-data-display/ecg-data-display.component';
import { JsonDataDisplayComponent } from './pages/json-data-display/json-data-display.component';

const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'ecg-data',
    component: EcgDataDisplayComponent,
  },
  {
    path: 'json-data',
    component: JsonDataDisplayComponent,
  },
  {
    path: 'contact-us',
    component: ContactUsComponent,
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule {

 }

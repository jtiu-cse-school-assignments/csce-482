import { BrowserModule } from '@angular/platform-browser';
import { ChangeDetectorRef } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule }   from '@angular/forms';
import { NgModule } from '@angular/core';
import { NgxWebstorageModule } from 'ngx-webstorage';
import * as PlotlyJS from 'plotly.js/dist/plotly.js';
import { PlotlyModule } from 'angular-plotly.js';

import { SearchingService } from './core/services/searching.service'
import { SearchedGuard } from './core/services/searched.guard'

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SearchbarComponent } from './components/searchbar/searchbar.component';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { PatientProfileComponent } from './components/patient-profile/patient-profile.component';
import { SimilarPatientsComponent } from './components/similar-patients/similar-patients.component';
import { PatientComparisonComponent } from './components/patient-comparison/patient-comparison.component';
import { ClusterGraphComponent } from './components/cluster-graph/cluster-graph.component';
import { AdmissionProfileComponent } from './components/admission-profile/admission-profile.component';
import { LabEventsGraphComponent } from './components/lab-events-graph/lab-events-graph.component';
import { ChartEventsGraphComponent } from './components/chart-events-graph/chart-events-graph.component';

PlotlyModule.plotlyjs = PlotlyJS;

@NgModule({
  declarations: [
    AppComponent,
    SearchbarComponent,
    HeaderComponent,
    FooterComponent,
    PatientProfileComponent,
    SimilarPatientsComponent,
    PatientComparisonComponent,
    ClusterGraphComponent,
    AdmissionProfileComponent,
    LabEventsGraphComponent,
    ChartEventsGraphComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    PlotlyModule,
    NgxWebstorageModule.forRoot(),
    AppRoutingModule
  ],
  providers: [SearchingService, SearchedGuard],
  bootstrap: [AppComponent]
})
export class AppModule { }

import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchbarComponent } from '../searchbar/searchbar.component'

import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

import * as PlotlyJS from 'plotly.js/dist/plotly.js';
import { PlotlyModule } from 'angular-plotly.js';
import { FormsModule, ReactiveFormsModule }   from '@angular/forms';
import { FormControl } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import {LocalStorageService, SessionStorageService, NgxWebstorageModule} from 'ngx-webstorage';
import {Router} from '@angular/router';

import { AdmissionProfileComponent } from './admission-profile.component';
import { SearchingService } from 'src/app/core/services/searching.service';
import { AppRoutingModule } from 'src/app/app-routing.module';
import { ClusterGraphComponent } from '../cluster-graph/cluster-graph.component'
import { PatientComparisonComponent } from '../patient-comparison/patient-comparison.component'
import { SimilarPatientsComponent } from '../similar-patients/similar-patients.component'
import { LabEventsGraphComponent } from '../lab-events-graph/lab-events-graph.component';
import { ChartEventsGraphComponent } from '../chart-events-graph/chart-events-graph.component';
import { PatientProfileComponent } from '../patient-profile/patient-profile.component';

describe('AdmissionProfileComponent', () => {
  let component: AdmissionProfileComponent;
  let fixture: ComponentFixture<AdmissionProfileComponent>;
  let de: DebugElement;

  beforeEach(async(() => {
    PlotlyModule.plotlyjs = PlotlyJS;

    TestBed.configureTestingModule({
      declarations: [ AdmissionProfileComponent, SearchbarComponent, ChartEventsGraphComponent, LabEventsGraphComponent, SearchbarComponent, ClusterGraphComponent, PatientComparisonComponent, AdmissionProfileComponent, SimilarPatientsComponent, PatientProfileComponent ],
      imports: [
        PlotlyModule,
        FormsModule,
        HttpClientModule,
        NgxWebstorageModule.forRoot(),
        AppRoutingModule
      ],
      providers: [SearchingService]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AdmissionProfileComponent);
    component = fixture.componentInstance;
    de = fixture.debugElement;

    fixture.detectChanges();
  });

//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });

    it('should display a list of admissions', ()=> {
        expect(de.query(By.css('.admissions'))).toBeDefined();
    });
});

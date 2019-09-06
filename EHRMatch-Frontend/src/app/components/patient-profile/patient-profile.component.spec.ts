import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchbarComponent } from '../searchbar/searchbar.component'
import { ClusterGraphComponent } from '../cluster-graph/cluster-graph.component'
import { PatientComparisonComponent } from '../patient-comparison/patient-comparison.component'
import { AdmissionProfileComponent } from '../admission-profile/admission-profile.component'
import { SimilarPatientsComponent } from '../similar-patients/similar-patients.component'
import { LabEventsGraphComponent } from '../lab-events-graph/lab-events-graph.component';
import { ChartEventsGraphComponent } from '../chart-events-graph/chart-events-graph.component';


import { PatientProfileComponent } from './patient-profile.component';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { FormControl } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import {LocalStorageService, SessionStorageService, NgxWebstorageModule} from 'ngx-webstorage';
import { SearchingService } from 'src/app/core/services/searching.service';
import { FormsModule, ReactiveFormsModule }   from '@angular/forms';
import { AppRoutingModule } from 'src/app/app-routing.module';
import * as PlotlyJS from 'plotly.js/dist/plotly.js';
import { PlotlyModule } from 'angular-plotly.js';

describe('PatientProfileComponent', () => {
  let component: PatientProfileComponent;
  let fixture: ComponentFixture<PatientProfileComponent>;
  let de: DebugElement;

  beforeEach(async(() => {
    PlotlyModule.plotlyjs = PlotlyJS;

    TestBed.configureTestingModule({
      declarations: [ PatientProfileComponent, ChartEventsGraphComponent, LabEventsGraphComponent, SearchbarComponent, ClusterGraphComponent, PatientComparisonComponent, AdmissionProfileComponent, SimilarPatientsComponent ],
      imports: [
        PlotlyModule,
        FormsModule,
        HttpClientModule,
        NgxWebstorageModule.forRoot(),
        AppRoutingModule
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PatientProfileComponent);
    component = fixture.componentInstance;
    de = fixture.debugElement;
    fixture.detectChanges();
  });

//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });

  it('should show patient demographic, admission, and procedures profile information', () => {
    expect(de.query(By.css('.demographic-info'))).toBeDefined();
  });
});

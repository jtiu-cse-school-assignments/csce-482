import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

import * as PlotlyJS from 'plotly.js/dist/plotly.js';
import { PlotlyModule } from 'angular-plotly.js';
import { FormsModule, ReactiveFormsModule }   from '@angular/forms';
import { FormControl } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import {LocalStorageService, SessionStorageService, NgxWebstorageModule} from 'ngx-webstorage';

import { ClusterGraphComponent } from './cluster-graph.component';
import { SimilarPatientsComponent } from '../similar-patients/similar-patients.component'
import { SearchingService } from 'src/app/core/services/searching.service';

describe('ClusterGraphComponent', () => {
  let component: ClusterGraphComponent;
  let fixture: ComponentFixture<ClusterGraphComponent>;
  let de: DebugElement;

  beforeEach(async(() => {
    PlotlyModule.plotlyjs = PlotlyJS;

    TestBed.configureTestingModule({
      declarations: [ ClusterGraphComponent, SimilarPatientsComponent ],
      imports: [
        PlotlyModule,
        FormsModule,
        HttpClientModule,
        NgxWebstorageModule.forRoot(),
      ],
      providers: [SearchingService]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ClusterGraphComponent);
    component = fixture.componentInstance;
    de = fixture.debugElement;

    fixture.detectChanges();
  });

//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });

  it('should display the parrallel coordinate graph', ()=> {
      expect(de.query(By.css('plotly-plot'))).toBeDefined();
  });
});

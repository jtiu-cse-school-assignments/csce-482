import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

import * as PlotlyJS from 'plotly.js/dist/plotly.js';
import { PlotlyModule } from 'angular-plotly.js';
import { FormsModule, ReactiveFormsModule }   from '@angular/forms';
import { FormControl } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import {LocalStorageService, SessionStorageService, NgxWebstorageModule} from 'ngx-webstorage';

import { ChartEventsGraphComponent } from './chart-events-graph.component';

describe('ChartEventsGraphComponent', () => {
  let component: ChartEventsGraphComponent;
  let fixture: ComponentFixture<ChartEventsGraphComponent>;
  let de: DebugElement;

  beforeEach(async(() => {
    PlotlyModule.plotlyjs = PlotlyJS;

    TestBed.configureTestingModule({
      declarations: [ ChartEventsGraphComponent ],
      imports: [
        PlotlyModule,
        FormsModule,
        HttpClientModule,
        NgxWebstorageModule.forRoot(),
      ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ChartEventsGraphComponent);
    component = fixture.componentInstance;
    de = fixture.debugElement;

    fixture.detectChanges();
  });

//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });

    it('should display the heatmap for chart events', ()=> {
        expect(de.query(By.css('plotly-plot'))).toBeDefined();
    });
});

import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import * as PlotlyJS from 'plotly.js/dist/plotly.js';
import { PlotlyModule } from 'angular-plotly.js';
import { FormsModule, ReactiveFormsModule }   from '@angular/forms';
import { FormControl } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import {LocalStorageService, SessionStorageService, NgxWebstorageModule} from 'ngx-webstorage';
import { SearchingService } from 'src/app/core/services/searching.service';

import { LabEventsGraphComponent } from './lab-events-graph.component';

describe('LabEventsGraphComponent', () => {
  let component: LabEventsGraphComponent;
  let fixture: ComponentFixture<LabEventsGraphComponent>;
  let de: DebugElement;

  beforeEach(async(() => {
    PlotlyModule.plotlyjs = PlotlyJS;
    
    TestBed.configureTestingModule({
      declarations: [ LabEventsGraphComponent ],
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
    fixture = TestBed.createComponent(LabEventsGraphComponent);
    component = fixture.componentInstance;
    de = fixture.debugElement;

    fixture.detectChanges();
  });

//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });
    it('should display the line graph/scatter plot for lab events', ()=> {
        expect(de.query(By.css('plotly-plot'))).toBeDefined();
    });
});

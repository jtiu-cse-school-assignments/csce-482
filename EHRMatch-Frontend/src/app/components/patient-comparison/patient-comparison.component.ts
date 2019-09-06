import { Component, OnInit } from '@angular/core';
import { SearchingService } from '../../core/services/searching.service'
import { LocalStorageService } from 'ngx-webstorage';
import { Router } from '@angular/router';

@Component({
  selector: 'app-patient-comparison',
  templateUrl: './patient-comparison.component.html',
  styleUrls: ['./patient-comparison.component.css']
})
export class PatientComparisonComponent implements OnInit {

  initialPatientID:string = null;
  initialPatientAdmissionID:string = null;
  similarPatientID:string = null;
  similarPatientAdmissionID:string = null;

  showGraphs:boolean = false;

  constructor(
    private searchingService: SearchingService,
    private storage:LocalStorageService,
  ) { }

  ngOnInit() {
    this.initialPatientID = this.storage.retrieve('subjectID');
    this.initialPatientAdmissionID = this.storage.retrieve('admissionID');
    this.similarPatientID = this.storage.retrieve('similarpatientid');
    this.similarPatientAdmissionID = this.storage.retrieve('similarpatientadmissionid');

    if(this.similarPatientAdmissionID && this.similarPatientAdmissionID) {
      this.showGraphs = true;
    }
  }


}

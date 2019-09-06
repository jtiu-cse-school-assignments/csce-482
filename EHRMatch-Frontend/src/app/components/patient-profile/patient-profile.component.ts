import { Component, OnInit, Input, SimpleChanges, OnChanges } from '@angular/core';
import { SearchingService } from '../../core/services/searching.service'
import {LocalStorageService, SessionStorageService} from 'ngx-webstorage';
import { Router } from '@angular/router';
import { FormControl } from '@angular/forms';

interface Patient {
  subjectID: number,
  numAdmissions: number,
  age: number,
  ethnicity: string,
  gender: string
  admission:object,
  procedures:Array<string>
}

@Component({
  selector: 'app-patient-profile',
  templateUrl: './patient-profile.component.html',
  styleUrls: ['./patient-profile.component.css']
})
export class PatientProfileComponent implements OnInit {

  @Input() passedPatientID;
  @Input() passedAdmissionID;

  notesForm = new FormControl('');

  responseFromBackend:object = null;
  responseFromBackend2:object = null;

  patientID:string = null;
  admissionID:string = null;
  last_note:string = null;

  showGraphs:boolean = false;
  okayToShowNotes:boolean = false;

  patient: Patient = {
    subjectID: null,
    numAdmissions: null,
    age: null,
    ethnicity: null,
    gender: null,
    admission: null,
    procedures: null
  }

  constructor(
    private searchingService:SearchingService,
    private storage:LocalStorageService,
    private router:Router
    ) { }

  ngOnInit() {
    
    if(this.router.url == '/patient-profile') {
      this.showGraphs = true;
      this.patientID = this.storage.retrieve('subjectID');
      this.admissionID = this.storage.retrieve('admissionID');

      this.searchingService.getProfile(this.patientID).subscribe(res => {
        this.responseFromBackend = res;
  
        this.searchingService.getEvents(this.patientID, this.admissionID).subscribe(res2 => {
          this.responseFromBackend2 = res2;
  
          this.setProfile();
        });
      });
    }
  }

  /************************************************************************************
    - Detects @Input variables. This is when these values are changed in the parent
      component
  */
  ngOnChanges(changes: SimpleChanges) {  
    this.patientID = this.passedPatientID;
    this.admissionID = this.passedAdmissionID;

    this.searchingService.getProfile(this.patientID).subscribe(res => {
      this.responseFromBackend = res;

      this.searchingService.getEvents(this.patientID, this.admissionID).subscribe(res2 => {
        this.responseFromBackend2 = res2;

        this.setProfile();
      });
    });
  }

  /************************************************************************************
    - Sets patient information that is independent from admission id
  */
  setProfile() {
    this.patient.subjectID = parseInt(this.patientID);
    this.patient.numAdmissions = this.responseFromBackend['num_admissions'];
    this.patient.ethnicity = this.responseFromBackend['ethnicity'];
    this.patient.gender = this.responseFromBackend['gender'];
    this.setAgeOfCurrentAdmissionID();
    this.setAdmission();
  }

  /************************************************************************************
    - Sets patient information that is dependent on admission id
  */
  setAdmission() {
    this.patient.admission = {};
    this.patient.procedures = this.responseFromBackend2['procedures'];


    for(var i = 0; i < this.responseFromBackend['admissions'].length; i++) {
      if(this.responseFromBackend['admissions'][i]['admin_id'] == this.admissionID) {
        this.patient.admission = {
          admission_type: this.responseFromBackend['admissions'][i]['admission_type'],
          diagnosis: this.responseFromBackend['admissions'][i]['diagnosis'],
          stay_length: parseInt(this.responseFromBackend['admissions'][i]['staylength']),
          icustay_count: this.responseFromBackend['admissions'][i]['icustay_count'],
          expired: this.responseFromBackend['admissions'][i]['expired'],
          admitted: this.responseFromBackend['admissions'][i]['admittime'],
          discharged: this.responseFromBackend['admissions'][i]['dishtime'],
          last_note: this.responseFromBackend['admissions'][i]['last_note']
        };
        this.last_note = this.responseFromBackend['admissions'][i]['last_note'];
      }
    }
  }

  /************************************************************************************
    - Sets the age of the patient. Age depends on the admission id
  */
  setAgeOfCurrentAdmissionID() {
    for(var i = 0; i < this.responseFromBackend['admissions'].length; i++) {
      if(this.responseFromBackend['admissions'][i]['admin_id'] == this.admissionID) {
        this.patient.age = parseInt(this.responseFromBackend['admissions'][i]['age']);
        break;
      }
    }
  }

  /************************************************************************************
    - Determines if the notes should be shown or not
  */
  showNotes() {
    this.okayToShowNotes = (this.notesForm.value == 'true');
  }

}

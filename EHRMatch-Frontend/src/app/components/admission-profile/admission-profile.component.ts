import { Component, OnInit, Input, OnChanges, SimpleChanges, SimpleChange } from '@angular/core';
import {LocalStorageService, SessionStorageService} from 'ngx-webstorage';
import { SearchingService } from '../../core/services/searching.service'
import {Router} from '@angular/router';

interface Admission {
  admissionID: number;
  admissionType: string;
  diagnosis: string;
}

@Component({
  selector: 'app-admission-profile',
  templateUrl: './admission-profile.component.html',
  styleUrls: ['./admission-profile.component.css']
})
export class AdmissionProfileComponent implements OnInit {

  @Input() patientID;

  responseFromBackend: any = {};
  
  patientNotExist:boolean = false;
  buttonClickable:boolean = true;

  initialBackendResponseAdmission: Array<string> = [];
  initialBackendResponseDiagnosis: Array<string> = [];
  initialBackendResponsehadmid: Array<number> = [];
  admissions:Array<object> = [];

  admission: Admission = {
    admissionID: null,
    admissionType: null,
    diagnosis: null
  };
  
  constructor(
    private localStorageService: LocalStorageService,
    private searchingService: SearchingService,
    private router: Router
    ) { }

  ngOnInit() {
    if(this.router.url == '/patient-comparison') {
      this.buttonClickable = false;
    }
  }

  /************************************************************************************
    - Detects changes on @Input patientID passed by parent
  */
  ngOnChanges(changes: SimpleChanges) {
    if(this.patientID) {
      this.storeInitialPatientInformation();
    }
  }

  /************************************************************************************
    - Stores initial patient information upon search
    - Keeps track if patient exists or not
  */
  storeInitialPatientInformation() {
    if(this.localStorageService.retrieve('subjectid') != null && this.localStorageService.retrieve('subjectID') != undefined) {
      this.searchingService.getProfile(this.patientID).subscribe( data => {
        this.responseFromBackend = data;
  
        this.initialBackendResponseAdmission = [];
        this.initialBackendResponseDiagnosis = [];
        this.initialBackendResponsehadmid = [];
  
  
        if(data['admissions'] == undefined) {
          this.patientNotExist = true;
        } else {
          this.patientNotExist = false;
          data['admissions'].forEach(element => {
            this.initialBackendResponseAdmission.push(element['admission_type']);
            this.initialBackendResponseDiagnosis.push(element['diagnosis']);
            this.initialBackendResponsehadmid.push(element['admin_id']);
          });
    
          this.localStorageService.store('initialBackendResponseAdmission', this.initialBackendResponseAdmission);
          this.localStorageService.store('initialBackendResponseDiagnosis', this.initialBackendResponseDiagnosis);
          this.localStorageService.store('initialBackendResponsehadmid', this.initialBackendResponsehadmid);
          
          this.generateAdmissionsArray();
        }
      });
    }
    else if(this.localStorageService.retrieve('subjectid') == null || this.localStorageService.retrieve('subjectID') == undefined) {      
      this.searchingService.getProfile(this.patientID).subscribe( data => {
        this.responseFromBackend = data;
  
        this.initialBackendResponseAdmission = [];
        this.initialBackendResponseDiagnosis = [];
        this.initialBackendResponsehadmid = [];
  
  
        if(data['admissions'] == undefined) {
          this.patientNotExist = true;
        } else {
          this.patientNotExist = false;
          data['admissions'].forEach(element => {
            this.initialBackendResponseAdmission.push(element['admission_type']);
            this.initialBackendResponseDiagnosis.push(element['diagnosis']);
            this.initialBackendResponsehadmid.push(element['admin_id']);
          });

          this.localStorageService.store('subjectID', this.patientID);
          this.localStorageService.store('initialBackendResponseAdmission', this.initialBackendResponseAdmission);
          this.localStorageService.store('initialBackendResponseDiagnosis', this.initialBackendResponseDiagnosis);
          this.localStorageService.store('initialBackendResponsehadmid', this.initialBackendResponsehadmid);
          
          this.generateAdmissionsArray();
        }
      });
    }
  }

  /************************************************************************************
    - Populates admissions array with admission information of patient
  */
  generateAdmissionsArray() {
    this.admissions = [];
    
    for(var i = 0; i < this.localStorageService.retrieve('initialbackendresponsehadmid').length; i++) {
      this.admissions.push({
        admissionID: this.localStorageService.retrieve('initialbackendresponsehadmid')[i],
        admissionType: this.localStorageService.retrieve('initialbackendresponseadmission')[i],
        diagnosis: this.localStorageService.retrieve('initialbackendresponsediagnosis')[i],
        stay_length: this.responseFromBackend['admissions'][i]['staylength'],
        icustay_count: this.responseFromBackend['admissions'][i]['icustay_count'],
        expired: this.responseFromBackend['admissions'][i]['expired'],
        admitted: this.responseFromBackend['admissions'][i]['admittime'],
        discharged: this.responseFromBackend['admissions'][i]['dishtime'],
        viewing: this.checkIfViewing(this.responseFromBackend['admissions'][i]['admin_id']),
      });
    }
  }

  /************************************************************************************
    - Stores the selected patient admission id for clustering and patient profile generation
  */
  storeSelectedAdmission(admission:string) {
    this.localStorageService.store('admissionID', admission);
    this.storeInitialPatientInformation();
    if(this.router.url === '/patient-profile') {
      location.reload();
    } else {
      this.router.navigate(['/patient-profile']);
    }
  }

  /************************************************************************************
    - Check to see if passed admission ID is the current viewed admissionID
  */
  checkIfViewing(admissionID:string) {
    if(admissionID === this.localStorageService.retrieve('admissionID')) {
      return true;
    }

    return false;
  }

}

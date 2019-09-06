import { Component, OnInit, Input, SimpleChanges } from '@angular/core';
import { SearchingService } from '../../core/services/searching.service'
import {LocalStorageService, SessionStorageService} from 'ngx-webstorage';
import {Router} from '@angular/router';

@Component({
  selector: 'app-similar-patients',
  templateUrl: './similar-patients.component.html',
  styleUrls: ['./similar-patients.component.css']
})
export class SimilarPatientsComponent implements OnInit {

  @Input() clusterResult;

  responseFromBackend:object = null;
  similarPatientsArray:Array<object> = null;

  constructor(
    private searchingService:SearchingService,
    private storage:LocalStorageService,
    private router: Router
  ) { }

  ngOnInit() {

    // First condition checks if the list is being generated from parent component or not.
    // It runs when clustering has not been done yet in the /clustering route
    if(this.clusterResult == undefined && !this.storage.retrieve('similarpatientid')) {
      this.searchingService.getClustering().subscribe(() => {
        this.searchingService.getRank().subscribe(res => {
          this.responseFromBackend = res;
          this.populateSmilarPatientsArray();
        });
      });
    } else if(this.storage.retrieve('similarPatientID')) {
      
      // In this condition, clustering was already done in /clustering route
      this.searchingService.getRank().subscribe(res => {
        this.responseFromBackend = res;
        this.populateSmilarPatientsArray();
      });
    }
  }

  /************************************************************************************
    - Detects changes on @Input to see if clustering is done by /clustering route
  */
  ngOnChanges(changes: SimpleChanges) {
    if(this.clusterResult) {
      this.searchingService.getRank().subscribe(res => {
        this.responseFromBackend = res;
        this.populateSmilarPatientsArray();
      });
    } 
  }

  /************************************************************************************
    - Populates the SimilarPatientArray with patients similar to the initial patient
  */
  populateSmilarPatientsArray() {
    this.similarPatientsArray = [];

    this.responseFromBackend['PList'].forEach(element => {
      let separatedByDash = [];
      separatedByDash = element.split("-");

      this.similarPatientsArray.push({
        similarPatientID: separatedByDash[0],
        similarPatientAdmissionID: separatedByDash[1],
        viewing: this.checkViewing(separatedByDash[0])
      });
    });
  }

  /************************************************************************************
    - Checks to see if the patient in SimilarPatientsArray is the currently selected
      similar patient. If so, then color differently in the views
  */
  checkViewing(similarPatientID:string) {
    if(this.storage.retrieve('similarPatientID') == similarPatientID) {
      return true;
    }

    return false
  }

  /************************************************************************************
    - Stores the selected similar patient
    - If done in /clustering, then go to /patient-comparison upon click
    - Else refresh the page because you're already in /patient-comparison
  */
  setSimilarPatient(similarPatient:object) {
    this.storage.store('similarPatientID', similarPatient['similarPatientID']);
    this.storage.store('similarPatientAdmissionID', similarPatient['similarPatientAdmissionID']);

    if(this.router.url != '/patient-comparison') {
      this.router.navigate(['/patient-comparison']);
    } else {
      location.reload();
    }
  }

}

import { Component, OnInit } from '@angular/core';
import {LocalStorageService, SessionStorageService} from 'ngx-webstorage';
import { Profile } from 'selenium-webdriver/firefox';
import { FormControl, FormBuilder, NgControl } from '@angular/forms';

interface PatientModel {
  patientID: string
}

@Component({
  selector: 'app-searchbar',
  templateUrl: './searchbar.component.html',
  styleUrls: ['./searchbar.component.css']
})
export class SearchbarComponent implements OnInit {

  patientModel: PatientModel = {
    patientID: null
  }

  patientIDToChild:string = "";

  constructor(
    private localStorageService: LocalStorageService,
    ) { }

  ngOnInit() {
    this.clearLocalStorage();
  }

  /************************************************************************************
    - Search Screen clears all localStorage data for new search
  */
  clearLocalStorage() {
    this.localStorageService.clear();
  }

  /************************************************************************************
    - Sets patientIDToChild so admissions-profile can be toggled on changes
  */
  searchPatient() {
    if(this.patientModel.patientID) {
      this.patientIDToChild = this.patientModel.patientID;
    }
  }

}

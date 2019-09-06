import { Injectable } from '@angular/core';
import {LocalStorageService, SessionStorageService} from 'ngx-webstorage';
import { HttpClient, HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class SearchingService {

  constructor(
    private httpClient:HttpClient,
    private storage:LocalStorageService
    ) { }

  searchPatient(patientID: string) {
    return this.httpClient.get<any>(`http://localhost:5000/search/${patientID}`);
  }

  getClustering() {
    let subjectID = this.storage.retrieve('subjectid');
    let admissionID = this.storage.retrieve('admissionid');

    return this.httpClient.get<any>(`http://localhost:5000/cluster/${subjectID}/${admissionID}`);
  }

  getSummaryTable() {
    return this.httpClient.get<any>(`http://localhost:5000/summary_table`);
  }

  getRank() {
    let subjectID = this.storage.retrieve('subjectid');
    let admissionID = this.storage.retrieve('admissionid');
    
    return this.httpClient.get<any>(`http://localhost:5000/rank/${subjectID}/${admissionID}`);
  }

  getEvents(subjectID:string, admissionID:string) {

    return this.httpClient.get<any>(`http://localhost:5000/profile_vitals/${subjectID}/${admissionID}`);
  }

  getProfile(subjectID:string) {

    return this.httpClient.get<any>(`http://localhost:5000/profile_patient/${subjectID}`);
  }

  getClusterNumber(subjectID:number, admissionID:string) {
    
    return this.httpClient.get<any>(`http://localhost:5000/vitals/${subjectID}/${admissionID}`);
  }
}

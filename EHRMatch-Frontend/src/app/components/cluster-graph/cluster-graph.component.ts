import { Component, OnInit, Input } from '@angular/core';
import { FormControl } from '@angular/forms';
import {LocalStorageService, SessionStorageService} from 'ngx-webstorage';
import { SearchingService } from '../../core/services/searching.service'

@Component({
  selector: 'app-cluster-graph',
  templateUrl: './cluster-graph.component.html',
  styleUrls: ['./cluster-graph.component.css']
})
export class ClusterGraphComponent implements OnInit {

  zoomScale = new FormControl('');
  selectCluster = new FormControl('');

  public graph:object = null;
  responseFromBackend:object = {};
  responseFromBackend2:object = {};

  columnNames:Array<string> = [];
  rowNames:Array<string> = [];
  listOfClusters:Array<number> = [];
  checkedClusters:Array<number> = [];
  boolValuesOfCheckedArray:Array<boolean> = [];
  summaryTableArray:Array<object> = [];
  outcomePercentagesClusterLevelArray:Array<object> = [];
  outcomePercentagesGlobalLevelArray:Array<object> = [];
  outcomePercentagesGlobalVariableArray:Array<object> = [];

  okayToShowClusterInfoForm:boolean = true;
  okayToShowClusterInfo:boolean = false;
  okayToShowCheckbox:boolean = true;

  finalSelectedClusterValue:string = null;

  patientClusterNumber:number = null;
  patientID:number = null;

  constructor(
    private searchingService: SearchingService,
    private storage:LocalStorageService
    ) { }

  ngOnInit() {
    this.searchingService.getClustering().subscribe(res => {
      this.responseFromBackend = res;
      this.checkedClusters = this.generateUniqueClusters(Object.values(res['Cluster Label']));
      
      this.countHowManyClusters();
      this.getInitialPatientCluster();
      this.generateGraph();
      
      this.searchingService.getSummaryTable().subscribe(res2 => {
        this.responseFromBackend2 = res2;
        
        this.generateSummaryTable();
        this.generateOutcomePercentages();
        this.generateTableRowNames();
        this.generateTableColNames();
      });
    });
  }

  /************************************************************************************
    - Get the initial patient's cluster number
  */
  getInitialPatientCluster() {
    this.patientID = this.storage.retrieve('subjectID');
    let admissionID = this.storage.retrieve('admissionID');

    this.searchingService.getClusterNumber(this.patientID, admissionID).subscribe(res => {
      this.patientClusterNumber = res['Cluster Label'];
    });

  }

  /************************************************************************************
    - Generates a list of row names for the table. These should be the statistic names
      for the statistic information table
      - "IQR", "Mean", "Median", ...
  */
  generateTableRowNames() {
    for(var i in this.responseFromBackend2[0]) {
      this.rowNames.push(i);
    }
  }

  /************************************************************************************
    - Generates a list of column names for the table. These should be the axis names
      for the statistic information table
    - "BP Systolic", ...
  */
  generateTableColNames() {
    for(var i in this.responseFromBackend) {
      if(i !== 'SId' && i !== 'AId' && i !== 'Cluster Label' && i !== 'Outcome') {
        this.columnNames.push(i);
      }
    }

    this.columnNames = Array.from(new Set(this.columnNames));
  }

  /************************************************************************************
    - Gets a list of all the different clusters in the dataset in a sorted order
  */
  generateUniqueClusters(arrayOfClusters:Array<number>) {
    arrayOfClusters = Array.from(new Set(arrayOfClusters));

    arrayOfClusters.sort(function(a, b){return a-b});

    return arrayOfClusters;
  }

  /************************************************************************************
    Draws the graph object
  */
  generateGraph() {
    this.graph = {
      data: [{
        type: 'parcoords',
        dimensions: this.generateDimensions(),
        line: {
          color: this.generateColor(),
          colorscale: 'Electric',
          cmin: 0,
          cmax: this.listOfClusters.length
        }
      }],

      layout: {
        margin: {
          t: 80,
          l: 50,
          r: 50,
          b: 50
        }
      }
    };
  }

  /************************************************************************************
    - Populates the datapoints for each parallel coordinate y-axis.
    - Each y-axis is it's own object in the dimensions array
    - Also generate the names of each yaxis and push them to yAxisNames
  */
  generateDimensions() {
    let dimensions = [];

    // SId, AId, and Cluster Label should not be in the array
    for(var i in this.responseFromBackend) {
      if(i !== 'SId' && i !== 'AId' && i !== 'Cluster Label' && i !== 'Outcome') {
        dimensions.push({
          range: this.generateAxisRange(Object.values(this.responseFromBackend[i])),
          label: i,
          values: this.generateAxisValues(this.responseFromBackend[i])
        });
      }
    }

    // Push the outcomes array last so that it will always be the last axis on the graph
    dimensions.push({
      range: [0,2],
      label: 'Outcome',
      values: Object.values(this.responseFromBackend['Outcome']),
      tickvals: [0,1,2],
      ticktext: ['Dead', 'Alive', 'Readmitted']
    });

    return dimensions;
  }

  /************************************************************************************
    - Generates the colors of each cluster based on their cluster label
    - The only colors that should show up are the colors of the checked clusters
  */
  generateColor() {
    let colors = []
    for(var i in this.responseFromBackend['Cluster Label']) {
      if(this.checkedClusters.includes(this.responseFromBackend['Cluster Label'][i])) {
        colors.push(this.responseFromBackend['Cluster Label'][i]);
      } else {
        // Value 1000 does not get colored on the graph according to the graph colorscale
        // These plots will not appear in the graph
        colors.push(1000)
      }
    }
    return colors;
  }
  
  /***********************************************************************************/
  countHowManyClusters() {
    let numClusters = 0;
    let arrayOfClusters = Object.values(this.responseFromBackend['Cluster Label']);

    arrayOfClusters = Array.from(new Set(arrayOfClusters));
    arrayOfClusters = arrayOfClusters.sort();
    // For some reason, arrayOfClusters is an object, so this is how you convert it
    // to an array
    this.listOfClusters = Object.keys(arrayOfClusters).map(function(i){return arrayOfClusters[i]});
    this.boolValuesOfCheckedArray = Object.keys(arrayOfClusters).map(function(i){return true});
    numClusters = arrayOfClusters.length;

    return numClusters;
  }

  /************************************************************************************
    - For each axis, determin what is its optimal zoomable range or if the user wants 
      the min/max values
  */
  generateAxisRange(axis:Array<number>) {
    let differencesArray = [];
    let min = Math.min(...axis);
    let max = Math.max(...axis);

    // Calculate the difference between axis[i] and axis[i+1] and push to differencesArray
    for(var i = 0; i < axis.length-2; i++) {
      let difference = axis[i+1] - axis[i];
      differencesArray.push(Math.abs(difference));
    }

    let calculateMedian = (arr:Array<number>) => {
      const sorted = arr.slice().sort();
      const middle = Math.floor(sorted.length / 2);
  
      if (sorted.length % 2 === 0) {
          return (sorted[middle - 1] + sorted[middle]) / 2;
      }
  
      return sorted[middle];
    }

    // calculate the median of the axis
    let axisMedian = calculateMedian(axis);
    // calculate the median of the differenceArray. This acts as the factor that is multiplied by the zoomScale
    let differenceMedian = calculateMedian(differencesArray); 

    return (!this.zoomScale.value || this.zoomScale.value == 'min/max') ? [min, max] : [axisMedian-(differenceMedian*this.zoomScale.value), axisMedian+(differenceMedian*this.zoomScale.value)];
  }

  /************************************************************************************
    - Plots the actual data values on the specified axis
  */
  generateAxisValues(axis:Array<number>) {
    let datapoints = [];
    for(var i in this.responseFromBackend['Cluster Label']) {
      if(this.checkedClusters.includes(this.responseFromBackend['Cluster Label'][i])) {
        datapoints.push(axis[i]);
      } else {
        datapoints.push(null)
      }
    }
    return datapoints;
  }
  
  /************************************************************************************
    - Checks to see if selected cluster is already on the checkedCluster list or not
    - This function triggers everytime the user checks/unchecks a cluster
  */
  checkSelectedCluster(cluster) {
    let foundCluster = false;

    console.log(cluster);
    for(var i = 0; i < this.checkedClusters.length; i++) {
      if(cluster == this.checkedClusters[i]) {
        this.checkedClusters.splice(i,1);
        foundCluster = true;
        this.boolValuesOfCheckedArray[cluster] = false;
      }
    }
    if(!foundCluster) {
      this.checkedClusters.push(cluster);
      this.boolValuesOfCheckedArray[cluster] = true;
    }

    console.log(this.boolValuesOfCheckedArray);
    if(this.boolValuesOfCheckedArray.includes(false)) {
      this.okayToShowClusterInfoForm = false;
    }
    else {
      this.okayToShowClusterInfoForm = true;
    }
  }

  /************************************************************************************
    - Populates summaryTableArray with statistics object for each cluster
  */
  generateSummaryTable() {
    for( var cluster in this.responseFromBackend2) {
      this.summaryTableArray.push({
        IQR: this.responseFromBackend2[cluster]['IQR'],
        Mean: this.responseFromBackend2[cluster]['Mean'],
        Median: this.responseFromBackend2[cluster]['Median'],
        Q1: this.responseFromBackend2[cluster]['Q1'],
        Q3: this.responseFromBackend2[cluster]['Q3'],
        'Standard Deviation': this.responseFromBackend2[cluster]['Standard Deviation']
      });
    }
  }

  /************************************************************************************
    - Populates outcomePercantagesArray with the outcome percentages of each cluster
  */
  generateOutcomePercentages() {
    this.outcomePercentagesClusterLevelArray = [];
    this.outcomePercentagesGlobalLevelArray = [];
    this.outcomePercentagesGlobalVariableArray = [];

    let totalDead = 0;
    let totalAlive = 0;
    let totalReadmitted = 0;

    for(var i = 0; i < Object.keys(this.responseFromBackend['Cluster Label']).length; i++) {
      if(this.responseFromBackend['Cluster Label'][i] == '0') {
        totalDead++;
      } else if(this.responseFromBackend['Cluster Label'][i] == '1') {
        totalAlive++;
      } else if(this.responseFromBackend['Cluster Label'][i] == '2') {
        totalReadmitted++;
      }
    }

    for(var cluster in this.responseFromBackend2) {
      let indexArrayOfClusterI = [];

      for(var i = 0; i < Object.keys(this.responseFromBackend['Cluster Label']).length; i++) {
        if(cluster == this.responseFromBackend['Cluster Label'][i]) {
          indexArrayOfClusterI.push(i);
        }
      }

      let numberOfPatientsInThisCLuster = indexArrayOfClusterI.length;
      let numberOfTotalPatientsInGraph = Object.keys(this.responseFromBackend['Cluster Label']).length;

      //calculate dead percentage for cluster
      let countDead = 0;
      for(var i = 0; i < indexArrayOfClusterI.length; i++) {
        if(this.responseFromBackend['Outcome'][indexArrayOfClusterI[i]] == "0") {
          countDead++;
        }
      }

      let percentDead1 = ((countDead/indexArrayOfClusterI.length)*100).toPrecision(3);
      let percentDead2 = ((countDead/Object.keys(this.responseFromBackend['Cluster Label']).length)*100).toPrecision(3);
      let percentDead3 = ((countDead/totalDead)*100).toPrecision(3);

      //calculate alive percentage for cluster
      let countAlive = 0;
      for(var i = 0; i < indexArrayOfClusterI.length; i++) {
        if(this.responseFromBackend['Outcome'][indexArrayOfClusterI[i]] == "1") {
          countAlive++;
        }
      } 

      let percentAlive1 = ((countAlive/indexArrayOfClusterI.length)*100).toPrecision(3);
      let percentAlive2 = ((countAlive/Object.keys(this.responseFromBackend['Cluster Label']).length)*100).toPrecision(3);
      let percentAlive3 = ((countAlive/totalAlive)*100).toPrecision(3);

      //calculate readmitted percentage for cluster
      let countreadmitted = 0;
      for(var i = 0; i < indexArrayOfClusterI.length; i++) {
        if(this.responseFromBackend['Outcome'][indexArrayOfClusterI[i]] == "2") {
          countreadmitted++;
        }
      } 

      let percentreadmitted1 = ((countreadmitted/indexArrayOfClusterI.length)*100).toPrecision(3);
      let percentreadmitted2 = ((countreadmitted/Object.keys(this.responseFromBackend['Cluster Label']).length)*100).toPrecision(3);
      let percentreadmitted3 = ((countreadmitted/totalReadmitted)*100).toPrecision(3);

      this.outcomePercentagesClusterLevelArray.push({
        numPatInClus: numberOfPatientsInThisCLuster,
        numAlive: countAlive,
        numDead: countDead,
        numReadmitted: countreadmitted,
        dead: percentDead1,
        alive: percentAlive1,
        readmitted: percentreadmitted1,
      });
      this.outcomePercentagesGlobalLevelArray.push({
        numPatInGraph: numberOfTotalPatientsInGraph,
        numAlive: countAlive,
        numDead: countDead,
        numReadmitted: countreadmitted,
        dead: percentDead2,
        alive: percentAlive2,
        readmitted: percentreadmitted2,
      });
      this.outcomePercentagesGlobalVariableArray.push({
        numAlive: countAlive,
        totalAlive: totalAlive,
        alive: percentAlive3,
        numDead: countDead,
        totalDead: totalDead,
        dead: percentDead3,
        numReadmitted: countreadmitted,
        totalReadmitted: totalReadmitted,
        readmitted: percentreadmitted3,
      });
    }
  }

  /************************************************************************************
    - Show statistical information of a slected cluster
    - Only show the selected cluster on the graph
    - disables checkbox for clusters if cluster is selected
    - enables checkbox for clusters if input is "no"
  */
  showClusterWithInfo() {
    if(this.selectCluster.value == "hidden" || this.selectCluster.value == null || this.selectCluster.value == "") {
      
      this.checkedClusters = this.generateUniqueClusters(Object.values(this.responseFromBackend['Cluster Label']));
      
      this.selectCluster.setValue("hidden");
      
      this.okayToShowCheckbox = true;
      this.okayToShowClusterInfo = false;
      
      this.generateGraph();
    } else {
      this.okayToShowClusterInfo = true;
      this.okayToShowCheckbox = false;
      this.checkedClusters = []
      this.finalSelectedClusterValue = this.selectCluster.value;

      this.checkedClusters.push(parseInt(this.finalSelectedClusterValue));
      this.generateGraph();
    }
  }

}

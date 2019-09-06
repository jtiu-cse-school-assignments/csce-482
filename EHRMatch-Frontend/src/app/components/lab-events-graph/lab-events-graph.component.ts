import { Component, OnInit, Input } from '@angular/core';
import { FormControl } from '@angular/forms';
import { SearchingService } from '../../core/services/searching.service'

@Component({
  selector: 'app-lab-events-graph',
  templateUrl: './lab-events-graph.component.html',
  styleUrls: ['./lab-events-graph.component.css']
})
export class LabEventsGraphComponent implements OnInit {

  @Input() patientID;
  @Input() admissionID;

  public graph:object = null;

  annotationsForm = new FormControl('');

  annotationsOn:boolean = true;

  responseFromBackend:object = null;
  
  yLabels:Array<string> = null;

  constructor(private searchingService: SearchingService) { }

  ngOnInit() {
    if(this.patientID && this.admissionID ) {
      this.searchingService.getEvents(this.patientID, this.admissionID).subscribe(res => {
        this.responseFromBackend = res;
        
        this.generateGraph();
      });
    }
  }

  /************************************************************************************
    - Draws the graph object
  */
  generateGraph() {
    this.graph = {
      data: [{
        type: 'heatmap',
        x: this.generateX(),
        y: this.generateY(),
        z: this.generateZ(),
        text: this.generateText(),
        zmin: 0,
        zmax: 1,
        xgap: 1,
        ygap: 20,
        colorscale: [
          [0, 'rgb(85,186,166)'],
          [.5, 'white'],
          [1, 'rgb(186,85,95)']
        ],
        hoverinfo: 'text+x',
        showscale: false
      }],

      layout: {
        title: `Lab Events for Patient ${this.patientID} Under Admission ${this.admissionID}`,
        annotations: this.generateAnnotations(),
        xaxis: {
          type: 'category',
          tickmode: 'array',
          tickvals: this.generateX(),
          ticktext: this.generateticktext(),
          tickfont: {
            family: 'Old Standard TT, serif',
            size: 12,
            color: 'rgb(255,255,204)'
          },
          tickangle: '70',
          showticklabels: false,
          automargin: true,
          autosize: false,
        },
        margin: {
          t: 50,
          l: 100,
          r: 50,
          b: 50
        }
      }
    };
  }

  /************************************************************************************
    - Populates the abnormal/normal values for each lab event
  */
  generateZ() {
    let zGraph = [];
    let vitalFound = false;

    for(var i = 0; i < this.yLabels.length; i++) {
      let tempArray = [];
      for(var j = 0; j < this.responseFromBackend['labtimes'].length; j++) {
        if(this.responseFromBackend['labtimes'][j].length === 0) {
          tempArray.push(.5);
        }
        else if (this.responseFromBackend['labtimes'][j].length > 0) {
          vitalFound = false;
         
          // Remove the duplicate values in the same percentages. Only take the latest one
          for(var k = 0; k < this.responseFromBackend['labtimes'][j].length; k++) {
            if(this.yLabels[i] == this.responseFromBackend['labtimes'][j][k]['type'] && vitalFound == false) {
              vitalFound = true;
              if(this.responseFromBackend['labtimes'][j][k]['abnormal'] === null) {
                tempArray.push(0);
              }
              else {
                tempArray.push(1);
              }
            }
            else if(this.yLabels[i] == this.responseFromBackend['labtimes'][j][k]['type'] && vitalFound == true) {
              if(this.responseFromBackend['labtimes'][j][k]['abnormal'] === null) {
                tempArray.pop();
                tempArray.push(0);
              }
              else {
                tempArray.pop();
                tempArray.push(1);
              }
            }
          }
          if(vitalFound == false) {
            tempArray.push(.5);
          }
        }
      }
      zGraph.push(tempArray);
    }

    return zGraph;
  }

  /************************************************************************************
    - Creates an array from 1-100 representing percentage. In this way the graph will
      always be in a 1-100 scale regardless of varying labtimes for each patient
  */
  generateX() {
    let percentArray = Array.from(Array(100).keys());
    let plusOnePercentArray = percentArray.map(x => x+1);
    
    return plusOnePercentArray;
  }

  generateY() {
    let allLabels:Array<string> = [];

    for(var i = 0; i < this.responseFromBackend['labtimes'].length; i++) {
      for(var j = 0; j < this.responseFromBackend['labtimes'][i].length; j++) {
        allLabels.push(this.responseFromBackend['labtimes'][i][j]['type']);
      }
    }

    this.yLabels = Array.from(new Set(allLabels));
    return Array.from(new Set(allLabels));
  }

  /************************************************************************************
    - Populates the tooltip for each labevent
    - Inlcudes information regarding, yaxis, xaxis, percentage, labevent value
  */
  generateText() {
    let toolTipsArray = [];
    let vitalFound = false;

    for(var i = 0; i < this.yLabels.length; i++) {
      let toolTipsSubArray = [];
      for(var j = 0; j < this.responseFromBackend['labtimes'].length; j++) {
        let result = "";
        if(this.responseFromBackend['labtimes'][j].length === 0) {
          result = "";
        }
        else if (this.responseFromBackend['labtimes'][j].length > 0) {
          vitalFound = false;
          for(var k = 0; k < this.responseFromBackend['labtimes'][j].length; k++) {
            if(this.yLabels[i] == this.responseFromBackend['labtimes'][j][k]['type']) {
              vitalFound = true;
              result = `${this.yLabels[i]}<br>` + 
              `${this.responseFromBackend['labtimes'][j][k]['value']} ` + 
              `${this.responseFromBackend['labtimes'][j][k]['units']}<br>` + 
              `Percent stay: ${j}%`;
            }
          }
          if(vitalFound == false) {
            result = "";
          }
        }
        toolTipsSubArray.push(result);
      }
      toolTipsArray.push(toolTipsSubArray);
    }
    
    return toolTipsArray;
  }

  /************************************************************************************
    - Populates the labevent value hover for each labevent
  */
  generateAnnotations() {

    if(!this.annotationsOn) {
      return [];
    }

    let annotationsArray = [];
    let vitalFound = false;

    for(var i = 0; i < this.yLabels.length; i++) {
      for(var j = 0; j < this.responseFromBackend['labtimes'].length; j++) {
        let result = {};
        if(this.responseFromBackend['labtimes'][j].length === 0) {
          result = {
            text: '',
            x: j+1,
            y: i,
            showarrow: false
          };
        }
        else if (this.responseFromBackend['labtimes'][j].length > 0) {
          vitalFound = false;
          for(var k = 0; k < this.responseFromBackend['labtimes'][j].length; k++) {
            if(this.yLabels[i] == this.responseFromBackend['labtimes'][j][k]['type']) {
              vitalFound = true;
              if(this.responseFromBackend['labtimes'][j][k]['value']) {
                result =  {
                  text: this.responseFromBackend['labtimes'][j][k]['value'],
                  x: j+1,
                  y: i,
                  showarrow: false,
                  font: {
                    size: 15,
                    color: 'black'
                  }
                };
              }
              else {
                result =  {
                  text: "N/A",
                  x: j+1,
                  y: i,
                  showarrow: false,
                  font: {
                    size: 15,
                    color: 'black'
                  }
                };
              }
            }
          }
          if(vitalFound == false) {
            result = {
              text: '',
              x: j+1,
              y: i,
              showarrow: false
            };
          }
        }
        annotationsArray.push(result);
      }
    }
    
    return annotationsArray;
  }

  /************************************************************************************
    - Generates the custom xaxis labels by date or null instead of numbers 1-100
  */
  generateticktext() {
    let tickText = [];

    for(var i = 0; i < this.responseFromBackend['labtimes'].length; i++) {
      if(this.responseFromBackend['labtimes'][i].length == 0) {
        tickText.push(" ");
      }
      else {
        tickText.push(this.responseFromBackend['labtimes'][i][0]['date']);
      }
    }

    return tickText;
  }

  /************************************************************************************
    - Updates the graph upon form request submit
    - Turns graph annotations either on or off
  */
  updateGraph() {
    this.annotationsOn = (this.annotationsForm.value === 'true');
    this.generateGraph()
  }

}

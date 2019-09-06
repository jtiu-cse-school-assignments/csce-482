import { Component, OnInit, Input } from '@angular/core';
import { SearchingService } from '../../core/services/searching.service'

@Component({
  selector: 'app-chart-events-graph',
  templateUrl: './chart-events-graph.component.html',
  styleUrls: ['./chart-events-graph.component.css']
})
export class ChartEventsGraphComponent implements OnInit {

  @Input() patientID;
  @Input() admissionID;

  public graph:object = null;
  responseFromBackend:object = null;
  
  graphTitles:Array<string> = [];

  constructor(private searchingService: SearchingService) { }

  ngOnInit() {
    if(this.patientID && this.admissionID ) {
      this.searchingService.getEvents(this.patientID, this.admissionID).subscribe(res => {
        this.responseFromBackend = res;
        
        this.generateGraphTitles();
        this.generateGraph();
      });
    }
  }

  /************************************************************************************
    - Determines how many lines are on the graph and each of the lines' name
  */
  generateGraphTitles() {
    for(var i = 0; i < this.responseFromBackend['charttimes'].length; i++) {
      for(var j = 0; j < this.responseFromBackend['charttimes'][i].length; j++) {
        this.graphTitles.push(this.responseFromBackend['charttimes'][i][j]['type']);
      }
    }

    this.graphTitles = Array.from(new Set(this.graphTitles));

    return this.graphTitles.length;
  }

  /************************************************************************************
    - Draws the graph object
  */
  generateGraph() {
    this.graph = {
      data: this.generateDataArray(),
      layout: {
        title: `Chart Events for Patient ${this.patientID} Under Admission ${this.admissionID}`,
        xaxis: {
          type: 'category',
          automargin: true,
          autosize: false,
          showticklabels: false,
          tickmode: 'array',
          tickvals: this.generateXValues(),
          ticktext: this.generateTickText()
        },
        margin: {
          t: 50,
          b: 10
        }
      }
    }
  }

  /************************************************************************************
    - Generates the data attribute for each line of the line graph
  */
  generateDataArray() {
    let data = [];

      for(var i = 0; i < this.graphTitles.length; i++) {
        data.push({
          name: this.graphTitles[i],
          x: this.generateXValues(),
          y: this.generateYValues(this.graphTitles[i]),
          text: this.generateText(this.graphTitles[i]),
          mode: 'lines+markers',
          connectgaps: false,
          line: {
            color: this.generateRandomColor(),
            width: 2
          },
          hoverinfo: 'text'
        });
      }

    return data;
  }

  /************************************************************************************
    - Makes an array of 100 representing percentage for the xaxis
    - This is the scale of the graph, so each patient will have chart events in a
      uniform scale
  */
  generateXValues() {
    return Array.from(Array(100).keys());
  }

  /************************************************************************************
    - Populates the data values for each line depending on the passed line's name
  */
  generateYValues(title:string) {
    let yValues = [];
    let found = false;

    for(var i = 0; i < this.responseFromBackend['charttimes'].length; i++) {
      found = false;
      if(this.responseFromBackend['charttimes'][i].length == 0) {
        yValues.push(null);
      } else {
        for(var j = 0; j < this.responseFromBackend['charttimes'][i].length; j++) {
          if(title === this.responseFromBackend['charttimes'][i][j]['type'] && found == false) {
            found = true;
            yValues.push(this.responseFromBackend['charttimes'][i][j]['value']);
          }
          else if(title === this.responseFromBackend['charttimes'][i][j]['type'] && found == true) {
            yValues.pop();
            yValues.push(this.responseFromBackend['charttimes'][i][j]['value'])
          }
        }
        if(!found) {
          yValues.push(null);
        }
      }
    }

    return yValues;
  }

  /************************************************************************************
    - Generates the tooltip for each data value for each trace
  */
  generateText(title:string) {
    let texts = [];
    let found = false;

    for(var i = 0; i < this.responseFromBackend['charttimes'].length; i++) {
      let result = "";
      found = false;
      if(this.responseFromBackend['charttimes'][i].length == 0) {
        result = "";
      } else {
        for(var j = 0; j < this.responseFromBackend['charttimes'][i].length; j++) {
          if(title === this.responseFromBackend['charttimes'][i][j]['type'] && found == false) {
            found = true;
            result = `(${this.responseFromBackend['charttimes'][i][j]['date']}, ` + 
            `${title}, ` +
            `${this.responseFromBackend['charttimes'][i][j]['value']} ` +
            `${this.responseFromBackend['charttimes'][i][j]['units']})`;
          }
        }
        if(!found) {
          result = "";
        }
      }
      texts.push(result);
    }

    return texts;
  }

  /************************************************************************************
    - Generates the custom names of the xaxis ticks
    - Instead of 1-100, show either the date taken or null
  */
  generateTickText() {
    let xValues = [];

    for(var i = 0; i < this.responseFromBackend['charttimes'].length; i++) {
      if(this.responseFromBackend['charttimes'][i].length == 0) {
        xValues.push("");
      } else {
        xValues.push(this.responseFromBackend['charttimes'][i][0]['date']);
      }
    }

    return xValues;
  }

  /************************************************************************************
    - Generates random color of a specific line
  */
  generateRandomColor() {
    let r = Math.floor(Math.random()*256);
    let g = Math.floor(Math.random()*256);
    let b = Math.floor(Math.random()*256);
    
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

}

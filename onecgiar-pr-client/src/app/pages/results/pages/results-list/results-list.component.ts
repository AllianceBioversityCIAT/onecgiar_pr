import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-results-list',
  templateUrl: './results-list.component.html',
  styleUrls: ['./results-list.component.scss']
})
export class ResultsListComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    console.log("ngOnDestroy ResultsListComponent")
  }

}

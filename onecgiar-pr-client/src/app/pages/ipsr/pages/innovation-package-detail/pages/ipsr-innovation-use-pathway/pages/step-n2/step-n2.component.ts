import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/shared/services/api/api.service';

@Component({
  selector: 'app-step-n2',
  templateUrl: './step-n2.component.html',
  styleUrls: ['./step-n2.component.scss']
})
export class StepN2Component implements OnInit {
  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.setTitle('Step 2');
  }
}

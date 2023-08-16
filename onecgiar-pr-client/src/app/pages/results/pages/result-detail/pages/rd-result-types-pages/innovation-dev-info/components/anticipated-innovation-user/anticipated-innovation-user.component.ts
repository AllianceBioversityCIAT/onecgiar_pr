import { Component, Input, OnInit } from '@angular/core';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';

@Component({
  selector: 'app-anticipated-innovation-user',
  templateUrl: './anticipated-innovation-user.component.html',
  styleUrls: ['./anticipated-innovation-user.component.scss']
})
export class AnticipatedInnovationUserComponent implements OnInit {
  @Input() body = new InnovationDevInfoBody();
  constructor() {}

  ngOnInit(): void {
    console.log(this.body);
  }
}

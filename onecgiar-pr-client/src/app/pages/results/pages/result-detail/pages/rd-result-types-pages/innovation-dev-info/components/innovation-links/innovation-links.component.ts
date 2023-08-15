import { Component, OnInit } from '@angular/core';
import { RolesService } from '../../../../../../../../../shared/services/global/roles.service';
import { ApiService } from 'src/app/shared/services/api/api.service';

@Component({
  selector: 'app-innovation-links',
  templateUrl: './innovation-links.component.html',
  styleUrls: ['./innovation-links.component.scss']
})
export class InnovationLinksComponent implements OnInit {
  linkList1 = [{}];
  linkList2 = [{}];
  constructor(public api: ApiService) {}

  ngOnInit(): void {}

  addLink() {
    this.linkList1.push({});
  }
  deleteLink(index) {
    this.linkList1.splice(index, 1);
  }
}

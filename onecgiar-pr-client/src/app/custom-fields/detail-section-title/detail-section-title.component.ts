import { Component, Input, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { DataControlService } from '../../shared/services/data-control.service';

@Component({
    selector: 'app-detail-section-title',
    templateUrl: './detail-section-title.component.html',
    styleUrls: ['./detail-section-title.component.scss'],
    standalone: false
})
export class DetailSectionTitleComponent implements OnInit {
  @Input() resultId: string;
  @Input() sectionName: string;
  @Input() title: string;
  constructor(private titleService: Title, private dataControlSE: DataControlService) {}

  ngOnInit(): void {
    this.titleService.setTitle(this.title ? this.title : this.sectionName);
    this.dataControlSE.currentSectionName = this.title ? this.title : this.sectionName;
  }
}

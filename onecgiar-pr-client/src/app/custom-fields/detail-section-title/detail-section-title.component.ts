import { Component, Input, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-detail-section-title',
  templateUrl: './detail-section-title.component.html',
  styleUrls: ['./detail-section-title.component.scss']
})
export class DetailSectionTitleComponent implements OnInit {
  @Input() resultId: string;
  @Input() sectionName: string;
  constructor(private titleService: Title) {}

  ngOnInit(): void {
    this.titleService.setTitle(this.sectionName);
  }
}

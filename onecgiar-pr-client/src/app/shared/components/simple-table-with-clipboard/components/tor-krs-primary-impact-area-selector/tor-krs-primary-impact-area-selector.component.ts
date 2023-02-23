import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-tor-krs-primary-impact-area-selector',
  templateUrl: './tor-krs-primary-impact-area-selector.component.html',
  styleUrls: ['./tor-krs-primary-impact-area-selector.component.scss']
})
export class TorKrsPrimaryImpactAreaSelectorComponent implements OnInit {
  isSaving = false;
  constructor() {}

  ngOnInit(): void {}

  onSave() {
    this.isSaving = true;
    setTimeout(() => {
      this.isSaving = false;
    }, 3000);
  }
}

import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-tor-krs-primary-impact-area-selector',
  templateUrl: './tor-krs-primary-impact-area-selector.component.html',
  styleUrls: ['./tor-krs-primary-impact-area-selector.component.scss']
})
export class TorKrsPrimaryImpactAreaSelectorComponent implements OnInit {
  isSaving = false;
  @Input() flatFormat: boolean;
  constructor() {}

  ngOnInit(): void {}

  onSave() {
    this.isSaving = true;
    setTimeout(() => {
      this.isSaving = false;
    }, 3000);
  }
}

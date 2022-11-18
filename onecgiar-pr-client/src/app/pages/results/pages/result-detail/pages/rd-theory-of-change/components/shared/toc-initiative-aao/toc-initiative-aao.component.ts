import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-toc-initiative-aao',
  templateUrl: './toc-initiative-aao.component.html',
  styleUrls: ['./toc-initiative-aao.component.scss']
})
export class TocInitiativeAaoComponent {
  @Input() readOnly: boolean;
  @Input() initiative: any;
  constructor() {}
}

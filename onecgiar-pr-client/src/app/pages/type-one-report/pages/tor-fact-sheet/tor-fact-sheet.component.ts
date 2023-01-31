import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-tor-fact-sheet',
  templateUrl: './tor-fact-sheet.component.html',
  styleUrls: ['./tor-fact-sheet.component.scss']
})
export class TorFactSheetComponent {
  header = [{ attr: 'category' }, { attr: 'value' }];
  data = [
    { category: 'Initiative name', value: 'Sustainable Animal Productivity for LIvelihoods, Nutrition and Gender inclusion' },
    { category: 'Initiative short name', value: 'Sustainable Animal Productivity' },
    { category: 'Initiative lead*', value: 'Isabelle Baltenweck - i.baltenweck@cgiar.org ' },
    { category: 'Initiative deputy*', value: 'Mourad Rekik - m.rekik@cgiar.org' },
    { category: 'Action Area*', value: 'Resilient Agrifood Systems' },
    { category: 'Start date', value: 'Day/Month/Year (to be filled)' },
    { category: 'End date', value: 'Day/Month/Year (to be filled)' },
    { category: 'Geographic location*', value: '' },
    { category: 'Measurable three-year (End of Initiative) outcomes', value: '' },
    { category: 'OECD DAC Climate marker Adaptation score', value: '' },
    { category: 'OECD DAC Climate marker Mitigation score', value: '' },
    { category: 'OECD DAC Gender equity marker score', value: '' },
    { category: 'Links to webpage', value: '' }
  ];
  constructor() {}
}

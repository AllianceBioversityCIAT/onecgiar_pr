import { Component, Input } from '@angular/core';
import { IpsrListFilterService } from '../../services/ipsr-list-filter.service';
import { IpsrListService } from '../../services/ipsr-list.service';
@Component({
  selector: 'app-ipsr-list-filters',
  templateUrl: './ipsr-list-filters.component.html',
  styleUrls: ['./ipsr-list-filters.component.scss']
})
export class IpsrListFiltersComponent {
  constructor(public ipsrListService: IpsrListService, public ipsrListFilterSE: IpsrListFilterService) {}
}

import { Component, Input } from '@angular/core';
import { IpsrListFilterService } from '../../services/ipsr-list-filter.service';
import { IpsrListService } from '../../services/ipsr-list.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-ipsr-list-filters',
  standalone: true,
  templateUrl: './ipsr-list-filters.component.html',
  styleUrls: ['./ipsr-list-filters.component.scss'],
  imports: [CommonModule, FormsModule]
})
export class IpsrListFiltersComponent {
  constructor(
    public ipsrListService: IpsrListService,
    public ipsrListFilterSE: IpsrListFilterService
  ) {}
}

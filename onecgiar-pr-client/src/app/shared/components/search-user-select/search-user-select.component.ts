import { Component, inject, signal } from '@angular/core';
import { UserSearchService } from '../../../pages/results/pages/result-detail/pages/rd-general-information/services/user-search-service.service';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';
import { SearchUser } from '../../interfaces/search-user.interface';

@Component({
  selector: 'app-search-user-select',
  standalone: true,
  imports: [DropdownModule, FormsModule],
  templateUrl: './search-user-select.component.html',
  styleUrl: './search-user-select.component.scss'
})
export class SearchUserSelectComponent {
  userSearchService = inject(UserSearchService);
  selectedCity = signal<any>({ value: null });
  options = signal<SearchUser[]>([]);

  constructor() {
    // No effect needed - we'll handle API calls explicitly
    this.userSearchService.searchUsers('yec').subscribe({
      next: res => {
        console.log(res.response);
        this.options.set(res.response);
      },
      error: error => {
        console.error('Error searching CGIAR users:', error);
      }
    });
  }
}

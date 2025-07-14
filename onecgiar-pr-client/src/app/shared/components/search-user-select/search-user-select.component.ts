import { Component, inject, signal, Output, EventEmitter } from '@angular/core';
import { UserSearchService } from '../../../pages/results/pages/result-detail/pages/rd-general-information/services/user-search-service.service';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SearchUser } from '../../interfaces/search-user.interface';

@Component({
  selector: 'app-search-user-select',
  standalone: true,
  imports: [DropdownModule, FormsModule, CommonModule],
  templateUrl: './search-user-select.component.html',
  styleUrl: './search-user-select.component.scss'
})
export class SearchUserSelectComponent {
  userSearchService = inject(UserSearchService);
  selectedUser = signal<SearchUser | null>(null);
  options = signal<SearchUser[]>([]);
  isDropdownOpen = signal<boolean>(false);

  @Output() userSelected = new EventEmitter<SearchUser>();

  constructor() {
    // Cargar usuarios iniciales
    this.userSearchService.searchUsers('ye').subscribe({
      next: res => {
        this.options.set(res.response);
      },
      error: error => {
        console.error('Error searching CGIAR users:', error);
      }
    });
  }

  onDropdownShow() {
    this.isDropdownOpen.set(true);
  }

  onDropdownHide() {
    this.isDropdownOpen.set(false);
  }

  onUserChange(user: SearchUser) {
    if (user) {
      this.selectedUser.set(user);
      this.userSelected.emit(user);
    }
  }
}

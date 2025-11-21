import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MultiSelectModule } from 'primeng/multiselect';
import { FormsModule } from '@angular/forms';

@Component({
  selector: '[app-results-review-filters]',
  imports: [
    CommonModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    ButtonModule,
    MultiSelectModule,
    FormsModule
  ],
  templateUrl: './results-review-filters.component.html',
  styleUrl: './results-review-filters.component.scss'
})
export class ResultsReviewFiltersComponent implements OnInit, OnDestroy {
  searchText: string = '';
  visible = signal<boolean>(false);
  navbarHeight = signal<number>(60);
  
  private resizeObserver?: ResizeObserver;

  // Dummy filter options
  dummyOptions1 = [
    { id: 1, name: 'Option 1' },
    { id: 2, name: 'Option 2' },
    { id: 3, name: 'Option 3' }
  ];

  dummyOptions2 = [
    { id: 1, name: 'Filter A' },
    { id: 2, name: 'Filter B' },
    { id: 3, name: 'Filter C' }
  ];

  totalTopHeight = computed(() => {
    return this.navbarHeight(); // Solo el navbar, el page header se tapa
  });

  ngOnInit(): void {
    this.calculateHeights();
    this.setupResizeObserver();
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  openFiltersDrawer(): void {
    this.visible.set(true);
  }

  closeFiltersDrawer(): void {
    this.visible.set(false);
  }

  applyFilters(): void {
    // Logic to apply filters
    this.visible.set(false);
  }

  clearFilters(): void {
    this.searchText = '';
    // Clear other filters
  }

  private calculateHeights(): void {
    // Calculate navbar height only
    const navbar = document.querySelector('app-header-panel') || 
                   document.querySelector('header') || 
                   document.querySelector('nav');
    
    if (navbar) {
      this.navbarHeight.set(navbar.getBoundingClientRect().height);
    }
  }

  private setupResizeObserver(): void {
    const navbar = document.querySelector('app-header-panel');

    if (navbar) {
      this.resizeObserver = new ResizeObserver(() => {
        this.calculateHeights();
      });

      this.resizeObserver.observe(navbar);
    }
  }
}

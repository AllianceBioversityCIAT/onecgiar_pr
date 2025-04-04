import { Injectable, signal } from '@angular/core';
import { ResultsApiService } from '../../../shared/services/api/results-api.service';
@Injectable({
  providedIn: 'root'
})
export class WhatsNewService {
  notionData = signal<any>(null);
  notionDataLoading = signal<boolean>(false);
  activeNotionPageData = signal<any>(null);

  constructor(private resultsApiService: ResultsApiService) {}

  getWhatsNew() {
    this.notionDataLoading.set(true);
    this.resultsApiService.getNotionData().subscribe({
      next: res => {
        this.notionData.set(res);
        this.notionDataLoading.set(false);
      },
      error: err => {
        this.notionDataLoading.set(false);
        console.error('error', err);
      }
    });
  }

  getNotionPage(notionPageId: string) {
    this.notionDataLoading.set(true);
    this.resultsApiService.getNotionPage(notionPageId).subscribe({
      next: res => {
        this.activeNotionPageData.set({
          ...this.activeNotionPageData(),
          headerInfo: {
            id: res.id,
            cover: res.cover,
            properties: res.properties
          }
        });
        this.notionDataLoading.set(false);
        console.log(this.activeNotionPageData());
      }
    });
  }

  getNotionBlockChildren(notionBlockId: string) {
    this.notionDataLoading.set(true);

    // First get the page data if needed
    if (!this.activeNotionPageData()) {
      this.resultsApiService.getNotionPage(notionBlockId).subscribe({
        next: pageRes => {
          this.activeNotionPageData.set({
            headerInfo: {
              id: pageRes.id,
              cover: pageRes.cover,
              properties: pageRes.properties
            }
          });

          // Now get the block children after page data is loaded
          this.getBlockChildren(notionBlockId);
        },
        error: err => {
          this.notionDataLoading.set(false);
          console.error('Error fetching notion page:', err);
        }
      });
    } else {
      // If we already have page data, just get the block children
      this.getBlockChildren(notionBlockId);
    }
  }

  private getBlockChildren(notionBlockId: string) {
    this.resultsApiService.getNotionBlockChildren(notionBlockId).subscribe({
      next: res => {
        this.activeNotionPageData.set({
          ...this.activeNotionPageData(),
          blocks: res.results
        });
        this.notionDataLoading.set(false);
        console.log(this.activeNotionPageData());
      },
      error: err => {
        this.notionDataLoading.set(false);
        console.error('Error fetching notion blocks:', err);
      }
    });
  }

  getColor(color: string) {
    switch (color) {
      case 'default':
        return '#313131';
      case 'gray':
        return '#414141';
      case 'brown':
        return '#674133';
      case 'orange':
        return '#7E4E29';
      case 'yellow':
        return '#97703D';
      case 'green':
        return '#2D6044';
      case 'blue':
        return '#2F5168';
      case 'purple':
        return '#53376C';
      case 'pink':
        return '#69334C';
      case 'red':
        return '#793C3B';
      default:
        return '#313131';
    }
  }
}

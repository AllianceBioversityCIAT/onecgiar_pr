import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CreateResultManagementService {
  showModal = signal<boolean>(true);
  // expandedItem = signal<AIAssistantResult | null>(null);
  // items = signal<AIAssistantResult[]>([]);

  selectedInitiative = signal<number | null>(null);
  selectedFile = signal<File | null>(null);

  analyzingDocument = signal<boolean>(false);
  documentAnalyzed = signal<boolean>(false);
  noResults = signal<boolean>(false);

  closeModal() {
    // this.expandedItem.set(null);
    // this.items.set([]);
    this.showModal.set(false);
    this.selectedFile.set(null);
    this.selectedInitiative.set(null);
    this.analyzingDocument.set(false);
    this.documentAnalyzed.set(false);
    this.noResults.set(false);
  }

  goBackToUploadNewFile() {
    this.selectedFile.set(null);
    this.analyzingDocument.set(false);
    this.documentAnalyzed.set(false);
    this.noResults.set(false);
  }
}

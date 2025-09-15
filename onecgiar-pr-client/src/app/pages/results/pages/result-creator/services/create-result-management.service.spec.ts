import { CreateResultManagementService } from './create-result-management.service';

describe('CreateResultManagementService', () => {
  let service: CreateResultManagementService;

  beforeEach(() => {
    service = new CreateResultManagementService();
  });

  it('should create the service', () => {
    expect(service).toBeTruthy();
  });

  it('should have correct default signal values', () => {
    expect(service.showModal()).toBe(false);
    expect(service.expandedItem()).toBeNull();
    expect(service.items()).toEqual([]);

    expect(service.selectedInitiative()).toBeNull();
    expect(service.selectedFile()).toBeNull();

    expect(service.analyzingDocument()).toBe(false);
    expect(service.documentAnalyzed()).toBe(false);
    expect(service.noResults()).toBe(false);

    expect(service.maxSizeMB).toBe(10);
    expect(service.pageLimit).toBe(100);
  });

  it('closeModal should reset all signals to defaults', () => {
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });

    service.showModal.set(true);
    service.expandedItem.set({
      id: '1',
      title: 't',
      summary: 's',
      confidence: 0.9,
      level: 'L',
      type: 'T',
      initiativeId: 123
    } as any);
    service.items.set([{ id: 'x' } as any]);
    service.selectedInitiative.set(99);
    service.selectedFile.set(file);
    service.analyzingDocument.set(true);
    service.documentAnalyzed.set(true);
    service.noResults.set(true);

    service.closeModal();

    expect(service.showModal()).toBe(false);
    expect(service.expandedItem()).toBeNull();
    expect(service.items()).toEqual([]);
    expect(service.selectedInitiative()).toBeNull();
    expect(service.selectedFile()).toBeNull();
    expect(service.analyzingDocument()).toBe(false);
    expect(service.documentAnalyzed()).toBe(false);
    expect(service.noResults()).toBe(false);
  });

  it('goBackToUploadNewFile should reset only file and analysis-related signals', () => {
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });

    service.showModal.set(true);
    service.expandedItem.set({ id: '2' } as any);
    service.items.set([{ id: 'y' } as any]);
    service.selectedInitiative.set(77);
    service.selectedFile.set(file);
    service.analyzingDocument.set(true);
    service.documentAnalyzed.set(true);
    service.noResults.set(true);

    service.goBackToUploadNewFile();

    expect(service.selectedFile()).toBeNull();
    expect(service.analyzingDocument()).toBe(false);
    expect(service.documentAnalyzed()).toBe(false);
    expect(service.noResults()).toBe(false);

    expect(service.showModal()).toBe(true);
    expect(service.expandedItem()).toEqual({ id: '2' } as any);
    expect(service.items()).toEqual([{ id: 'y' } as any]);
    expect(service.selectedInitiative()).toBe(77);
  });
});

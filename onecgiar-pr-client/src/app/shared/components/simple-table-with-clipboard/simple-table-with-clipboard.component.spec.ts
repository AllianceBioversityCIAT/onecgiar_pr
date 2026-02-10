import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { SimpleTableWithClipboardComponent } from './simple-table-with-clipboard.component';

describe('SimpleTableWithClipboardComponent', () => {
  let component: SimpleTableWithClipboardComponent;
  let fixture: ComponentFixture<SimpleTableWithClipboardComponent>;
  let messageService: MessageService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SimpleTableWithClipboardComponent],
      imports: [ToastModule],
      providers: [MessageService]
    })
      .compileComponents();

    fixture = TestBed.createComponent(SimpleTableWithClipboardComponent);
    component = fixture.componentInstance;
    messageService = TestBed.inject(MessageService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('copyTable', () => {
    let mockTable: any;
    let mockRange: any;
    let mockSelection: any;
    let execCommandSpy: jest.SpyInstance;
    let addSpy: jest.SpyInstance;

    beforeEach(() => {
      // Mock table element
      mockTable = {
        childNodes: {
          length: 5
        }
      };

      // Mock Range
      mockRange = {
        setStart: jest.fn(),
        setEnd: jest.fn()
      };
      global.Range = jest.fn(() => mockRange) as any;

      // Mock Selection
      mockSelection = {
        removeAllRanges: jest.fn(),
        addRange: jest.fn()
      };
      global.document.getSelection = jest.fn(() => mockSelection as any);

      // Mock execCommand - add it to document if it doesn't exist
      if (!document.execCommand) {
        (document as any).execCommand = jest.fn().mockReturnValue(true);
      }
      execCommandSpy = jest.spyOn(document as any, 'execCommand').mockReturnValue(true);

      // Get the MessageService from the component's injector (component has its own provider)
      const componentMessageService = fixture.debugElement.injector.get(MessageService);
      addSpy = jest.spyOn(componentMessageService, 'add');
    });


    it('should copy table to clipboard and show success message', fakeAsync(() => {
      component.flatFormat = false;

      component.copyTable(mockTable);

      // Fast-forward first timeout
      tick(200);

      expect(component.flatFormat).toBe(true);
      expect(mockRange.setStart).toHaveBeenCalledWith(mockTable, 0);
      expect(mockRange.setEnd).toHaveBeenCalledWith(mockTable, mockTable.childNodes.length);
      expect(mockSelection.removeAllRanges).toHaveBeenCalledTimes(2);
      expect(mockSelection.addRange).toHaveBeenCalledWith(mockRange);
      expect(execCommandSpy).toHaveBeenCalledWith('copy');
      expect(addSpy).toHaveBeenCalledWith({
        key: 'myKey1',
        severity: 'info',
        summary: 'Copied',
        detail: 'Table copied to clipboard'
      });

      // Fast-forward second timeout
      tick(200);

      expect(component.flatFormat).toBe(false);
    }));

    it('should reset flatFormat after timeout', fakeAsync(() => {
      component.flatFormat = false;

      component.copyTable(mockTable);

      // Fast-forward both timeouts
      tick(400);

      expect(component.flatFormat).toBe(false);
    }));
  });

  describe('validateObj', () => {
    it('should return true for object values', () => {
      expect(component.validateObj({})).toBe(true);
      expect(component.validateObj({ key: 'value' })).toBe(true);
      expect(component.validateObj([])).toBe(true);
      expect(component.validateObj(null)).toBe(true);
    });

    it('should return false for non-object values', () => {
      expect(component.validateObj('string')).toBe(false);
      expect(component.validateObj(123)).toBe(false);
      expect(component.validateObj(true)).toBe(false);
      expect(component.validateObj(undefined)).toBe(false);
    });
  });

  describe('getIndexColumnClass', () => {
    it('should return custom-class-1', () => {
      expect(component.getIndexColumnClass()).toBe('custom-class-1');
    });
  });
});

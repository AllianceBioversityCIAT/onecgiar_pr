import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BilateralAccordionComponent } from './bilateral-accordion.component';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralExpandableStateService } from '../../services/bilateral-expandable-state.service';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';

describe('BilateralAccordionComponent', () => {
  let component: BilateralAccordionComponent;
  let fixture: ComponentFixture<BilateralAccordionComponent>;
  let expandService: jest.Mocked<Partial<BilateralExpandableStateService>>;
  let autoSaveService: jest.Mocked<Partial<BilateralAutoSaveService>>;
  let creationService: jest.Mocked<Partial<BilateralCreationService>>;

  beforeEach(async () => {
    expandService = {
      getExpandState: jest.fn().mockReturnValue(false),
      setExpandState: jest.fn(),
      getShowAllFields: jest.fn().mockReturnValue(false),
      setShowAllFields: jest.fn(),
    };

    autoSaveService = {
      flush: jest.fn().mockResolvedValue(undefined),
    };

    creationService = {
      isLoadingResult: jest.fn().mockReturnValue(false),
    } as any;

    await TestBed.configureTestingModule({
      imports: [BilateralAccordionComponent],
      providers: [
        { provide: BilateralExpandableStateService, useValue: expandService },
        { provide: BilateralAutoSaveService, useValue: autoSaveService },
        { provide: BilateralCreationService, useValue: creationService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BilateralAccordionComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open on toggle when closed', () => {
    fixture.componentRef.setInput('sectionName', 'general-info');
    fixture.componentRef.setInput('sectionLabel', 'General Information');
    fixture.componentRef.setInput('resultId', 1);
    component.toggle();
    expect(component.isOpen).toBe(true);
  });

  it('should close on toggle when open', async () => {
    fixture.componentRef.setInput('sectionName', 'general-info');
    fixture.componentRef.setInput('sectionLabel', 'General Information');
    fixture.componentRef.setInput('resultId', 1);
    component.toggle();
    expect(component.isOpen).toBe(true);
    component.toggle();
    expect(autoSaveService.flush).toHaveBeenCalled();
  });

  it('should only one accordion be open via openSectionName model', () => {
    fixture.componentRef.setInput('sectionName', 'general-info');
    fixture.componentRef.setInput('sectionLabel', 'General Information');
    fixture.componentRef.setInput('resultId', 1);
    component.openSectionName.set('general-info');
    fixture.detectChanges();
    expect(component.isOpen).toBe(true);
    component.openSectionName.set('contributors');
    fixture.detectChanges();
    expect(component.isOpen).toBe(false);
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BilateralSpSelectorComponent } from './bilateral-sp-selector.component';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { signal } from '@angular/core';

describe('BilateralSpSelectorComponent', () => {
  let component: BilateralSpSelectorComponent;
  let fixture: ComponentFixture<BilateralSpSelectorComponent>;
  let creationService: any;

  beforeEach(async () => {
    creationService = {
      selectedProject: signal(null),
      selectedPrimarySp: signal(null),
      selectedSecondarySps: signal([]),
      selectPrimarySp: jest.fn(),
      toggleSecondarySp: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [BilateralSpSelectorComponent],
      providers: [{ provide: BilateralCreationService, useValue: creationService }],
    }).compileComponents();

    fixture = TestBed.createComponent(BilateralSpSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show empty hint when no project selected', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Select a project');
  });

  it('should populate available SPs from project', () => {
    const project = {
      sciencePrograms: [
        { programId: 100, programCode: 'P11', allocation: '45.00', spName: 'Climate Action', spShortName: 'CA' },
        { programId: 200, programCode: 'P12', allocation: '25.00', spName: 'Breeding', spShortName: 'BfT' },
      ],
    } as any;
    creationService.selectedProject.set(project);
    fixture.detectChanges();
    expect(component.availableSps().length).toBe(2);
  });

  it('should call selectPrimarySp on primary selection', () => {
    const emitSpy = jest.spyOn(component.primarySelected, 'emit');
    const sps = [
      { programId: 100, programCode: 'P11', allocation: '45.00', spName: 'Climate Action', spShortName: 'CA' },
    ];
    const project = { sciencePrograms: sps } as any;
    creationService.selectedProject.set(project);
    component.selectPrimary(100, 'P11', '45.00');
    expect(creationService.selectPrimarySp).toHaveBeenCalledWith({ programId: 100, programCode: 'P11', allocation: '45.00' });
    expect(emitSpy).toHaveBeenCalled();
  });

  it('should call toggleSecondarySp', () => {
    component.toggleSecondary(200, 'P12', '25.00');
    expect(creationService.toggleSecondarySp).toHaveBeenCalledWith({ programId: 200, programCode: 'P12', allocation: '25.00' });
  });
});

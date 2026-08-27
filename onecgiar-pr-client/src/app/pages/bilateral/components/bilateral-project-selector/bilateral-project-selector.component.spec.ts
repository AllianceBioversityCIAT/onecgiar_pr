import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BilateralProjectSelectorComponent } from './bilateral-project-selector.component';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { signal } from '@angular/core';

describe('BilateralProjectSelectorComponent', () => {
  let component: BilateralProjectSelectorComponent;
  let fixture: ComponentFixture<BilateralProjectSelectorComponent>;
  let creationService: any;
  let ctxService: any;

  beforeEach(async () => {
    creationService = {
      projects: signal([]),
      selectedProject: signal(null),
      isLoadingProjects: signal(false),
      getProjects: jest.fn(),
      selectProject: jest.fn(),
    };

    ctxService = {
      centerId: signal('CENTER-01'),
      centerInstitutionId: signal(49),
      centerAcronym: signal('C01'),
      centerName: signal('Center One'),
    };

    await TestBed.configureTestingModule({
      imports: [BilateralProjectSelectorComponent],
      providers: [
        { provide: BilateralCreationService, useValue: creationService },
        { provide: BilateralContextService, useValue: ctxService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BilateralProjectSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('asks for the projects of the current centre on init', () => {
    expect(creationService.getProjects).toHaveBeenCalledWith(49);
  });

  // ⚠️ Regression lock. The endpoint keys off the numeric CLARISA institution id. Passing the
  // centre CODE returns 200 with `{ projects: [] }` — no error anywhere, the dropdown just renders
  // empty, and with the Reporting Project field being mandatory NO bilateral result can be created
  // at all. Verified on prtest: `centerId=CIP` → [], `centerId=49` → 1 project.
  it('never passes the centre code — that silently returns an empty list', () => {
    expect(creationService.getProjects).not.toHaveBeenCalledWith('CENTER-01');
    expect(typeof creationService.getProjects.mock.calls[0][0]).toBe('number');
  });

  it('does not ask for projects until the institution id is known', () => {
    creationService.getProjects.mockClear();
    ctxService.centerInstitutionId.set(null);
    fixture.detectChanges();
    expect(creationService.getProjects).not.toHaveBeenCalled();
  });

  it('should emit on project select', () => {
    const emitSpy = jest.spyOn(component.projectSelected, 'emit');
    const project = { id: 1, shortName: 'P1', fullName: 'Project 1', summary: null, description: null, leadCenter: null, sciencePrograms: [] };
    creationService.projects.set([project]);
    component.selectProject(project);
    expect(creationService.selectProject).toHaveBeenCalledWith(project);
    expect(emitSpy).toHaveBeenCalledWith(project);
  });
});

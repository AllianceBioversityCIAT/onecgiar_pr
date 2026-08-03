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

  it('should call getProjects with first center on init', () => {
    expect(creationService.getProjects).toHaveBeenCalledWith('CENTER-01');
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

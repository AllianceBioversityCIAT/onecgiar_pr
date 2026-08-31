import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RouterModule } from '@angular/router';
import { of, throwError } from 'rxjs';
import { BilateralProjectsPanelComponent } from './bilateral-projects-panel.component';
import { BilateralApiService } from '../../../../../../shared/services/api/bilateral-api.service';
import { BilateralContextService } from '../../../../services/bilateral-context.service';
import { BilateralCreationService } from '../../../../services/bilateral-creation.service';
import { BilateralProject } from '../../../../services/bilateral-creation.interfaces';

describe('BilateralProjectsPanelComponent', () => {
  let component: BilateralProjectsPanelComponent;
  let fixture: ComponentFixture<BilateralProjectsPanelComponent>;
  let bilateralApiService: jest.Mocked<BilateralApiService>;
  let ctx: BilateralContextService;
  let creationService: BilateralCreationService;

  const mockProjects: BilateralProject[] = [
    {
      id: 101,
      shortName: 'B-A1080',
      fullName: 'Genetic Diversity Preservation and International Genebank Conservation',
      summary: 'Sustaining long-term preservation of genetic resources.',
      description: 'Detailed description for B-A1080.',
      leadCenter: { id: 1, name: 'Bioversity International', acronym: 'Bioversity' },
      sciencePrograms: [
        { programId: 1, programCode: 'GENE', spName: 'Genebank', spShortName: 'Genebank', allocation: '100' }
      ]
    },
    {
      id: 102,
      shortName: 'B-A1368',
      fullName: 'Next-Generation Crop Breeding Tools and Trait Introgression',
      summary: 'Accelerating crop breeding pipelines.',
      description: null,
      leadCenter: { id: 1, name: 'Bioversity International', acronym: 'Bioversity' },
      sciencePrograms: [
        { programId: 2, programCode: 'SP01', spName: 'Breeding for Tomorrow', spShortName: 'Breeding', allocation: '80' },
        { programId: 1, programCode: 'GENE', spName: 'Genebank', spShortName: 'Genebank', allocation: '20' }
      ]
    },
    {
      id: 103,
      shortName: 'B-A1532',
      fullName: 'Agroecological Landscape Restoration and Biodiversity Conservation',
      summary: 'Restoring Andean agricultural landscapes.',
      description: null,
      leadCenter: { id: 1, name: 'Bioversity International', acronym: 'Bioversity' },
      sciencePrograms: [
        { programId: 3, programCode: 'SP04', spName: 'Multifunctional Landscapes', spShortName: 'Landscapes', allocation: '100' }
      ]
    }
  ];

  beforeEach(async () => {
    const mockApiService = {
      GET_bilateralProjects: jest.fn().mockReturnValue(of({ response: mockProjects }))
    };

    await TestBed.configureTestingModule({
      imports: [BilateralProjectsPanelComponent, RouterModule.forRoot([])],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BilateralApiService, useValue: mockApiService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BilateralProjectsPanelComponent);
    component = fixture.componentInstance;
    bilateralApiService = TestBed.inject(BilateralApiService) as jest.Mocked<BilateralApiService>;
    ctx = TestBed.inject(BilateralContextService);
    creationService = TestBed.inject(BilateralCreationService);
  });

  afterEach(() => {
    try {
      sessionStorage.removeItem('pr.bilateral.viewMode');
    } catch {
      // Ignored in test environment
    }
  });

  it('should create and initialize default state', () => {
    expect(component).toBeTruthy();
    expect(component.selectedProgramFilter()).toBe('ALL');
    expect(component.selectedMultiProgramOnly()).toBe(false);
    expect(component.viewMode()).toBe('grid');
    expect(component.searchQuery()).toBe('');
  });

  it('should fetch projects and compute KPI metrics upon center resolution', () => {
    ctx.setCenter('Bioversity', 'Bioversity International', 'Bioversity');
    fixture.detectChanges();

    expect(bilateralApiService.GET_bilateralProjects).toHaveBeenCalledWith('Bioversity');
    expect(component.projects().length).toBe(3);

    const kpis = component.kpiSummary();
    expect(kpis.total).toBe(3);
    expect(kpis.multiProgramCount).toBe(1); // B-A1368 has 2 programs

    // Genebank is present in 2 projects, Breeding in 1, Landscapes in 1
    const genebankStat = kpis.byProgram.find(p => p.spName === 'Genebank');
    expect(genebankStat?.count).toBe(2);

    const breedingStat = kpis.byProgram.find(p => p.spName === 'Breeding for Tomorrow');
    expect(breedingStat?.count).toBe(1);
  });

  it('should filter projects when selectedProgramFilter is updated', () => {
    ctx.setCenter('Bioversity', 'Bioversity International', 'Bioversity');
    fixture.detectChanges();

    component.setProgramFilter('Multifunctional Landscapes');
    fixture.detectChanges();

    const filtered = component.filteredProjects();
    expect(filtered.length).toBe(1);
    expect(filtered[0].shortName).toBe('B-A1532');
  });

  it('should filter projects when selectedMultiProgramOnly is active', () => {
    ctx.setCenter('Bioversity', 'Bioversity International', 'Bioversity');
    fixture.detectChanges();

    component.setMultiProgramOnly(true);
    fixture.detectChanges();

    const filtered = component.filteredProjects();
    expect(filtered.length).toBe(1);
    expect(filtered[0].shortName).toBe('B-A1368');
  });

  it('should perform multi-attribute search matching across code, full title, and science programs', () => {
    ctx.setCenter('Bioversity', 'Bioversity International', 'Bioversity');
    fixture.detectChanges();

    // Match by code
    component.searchQuery.set('A1080');
    expect(component.filteredProjects().length).toBe(1);
    expect(component.filteredProjects()[0].shortName).toBe('B-A1080');

    // Match by title word
    component.searchQuery.set('Andean');
    expect(component.filteredProjects().length).toBe(1);
    expect(component.filteredProjects()[0].shortName).toBe('B-A1532');

    // Match by Science Program name
    component.searchQuery.set('Breeding');
    expect(component.filteredProjects().length).toBe(1);
    expect(component.filteredProjects()[0].shortName).toBe('B-A1368');
  });

  it('should reset all filters on resetAllFilters()', () => {
    ctx.setCenter('Bioversity', 'Bioversity International', 'Bioversity');
    fixture.detectChanges();

    component.searchQuery.set('search');
    component.setProgramFilter('Genebank');
    component.setMultiProgramOnly(true);

    component.resetAllFilters();
    expect(component.searchQuery()).toBe('');
    expect(component.selectedProgramFilter()).toBe('ALL');
    expect(component.selectedMultiProgramOnly()).toBe(false);
    expect(component.filteredProjects().length).toBe(3);
  });

  it('should toggle viewMode and persist preference in sessionStorage', () => {
    component.setViewMode('list');
    expect(component.viewMode()).toBe('list');
    expect(sessionStorage.getItem('pr.bilateral.viewMode')).toBe('list');

    component.setViewMode('grid');
    expect(component.viewMode()).toBe('grid');
    expect(sessionStorage.getItem('pr.bilateral.viewMode')).toBe('grid');
  });

  it('should call creationService.selectProject on selectAndCreate()', () => {
    const spy = jest.spyOn(creationService, 'selectProject');
    component.selectAndCreate(mockProjects[0]);
    expect(spy).toHaveBeenCalledWith(mockProjects[0]);
  });

  it('should set error state if API fails', () => {
    bilateralApiService.GET_bilateralProjects.mockReturnValue(throwError(() => new Error('API error')));

    ctx.setCenter('Bioversity', 'Bioversity International', 'Bioversity');
    fixture.detectChanges();

    expect(component.error()).toBe(true);
    expect(component.loading()).toBe(false);
    expect(component.projects().length).toBe(0);
  });

  it('should render project cards in DOM for Grid View (BIL-OVW-R-3, BIL-OVW-AC-3)', () => {
    ctx.setCenter('Bioversity', 'Bioversity International', 'Bioversity');
    component.setViewMode('grid');
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.bpp_card');
    expect(cards.length).toBe(3);

    const firstCard = cards[0];
    expect(firstCard.querySelector('.bpp_code_pill')?.textContent.trim()).toBe('B-A1080');
    expect(firstCard.querySelector('.bpp_card_title')?.textContent.trim()).toContain('Genetic Diversity Preservation');
    expect(firstCard.querySelector('.bpp_sp_chip')?.textContent).toContain('Genebank');
  });

  it('should render dense table rows in DOM for List View (BIL-OVW-R-4, BIL-OVW-AC-4)', () => {
    ctx.setCenter('Bioversity', 'Bioversity International', 'Bioversity');
    component.setViewMode('list');
    fixture.detectChanges();

    const table = fixture.nativeElement.querySelector('.bpp_table');
    expect(table).toBeTruthy();

    const rows = fixture.nativeElement.querySelectorAll('.bpp_table_row');
    expect(rows.length).toBe(3);

    const firstRow = rows[0];
    expect(firstRow.querySelector('.bpp_code_pill')?.textContent.trim()).toBe('B-A1080');
    expect(firstRow.querySelector('.bpp_table_title')?.textContent.trim()).toContain('Genetic Diversity Preservation');
  });

  it('should render empty state in DOM when no projects match and reset on click (BIL-OVW-R-7, BIL-OVW-AC-6)', () => {
    ctx.setCenter('Bioversity', 'Bioversity International', 'Bioversity');
    fixture.detectChanges();

    component.searchQuery.set('nonexistent-query-12345');
    fixture.detectChanges();

    const emptyState = fixture.nativeElement.querySelector('.bpp_empty_state');
    expect(emptyState).toBeTruthy();
    expect(emptyState.textContent).toContain('No projects match your filter criteria');

    const resetBtn = fixture.nativeElement.querySelector('.bpp_reset_btn');
    expect(resetBtn).toBeTruthy();
    resetBtn.click();
    fixture.detectChanges();

    expect(component.searchQuery()).toBe('');
    expect(fixture.nativeElement.querySelectorAll('.bpp_card').length).toBe(3);
  });
});

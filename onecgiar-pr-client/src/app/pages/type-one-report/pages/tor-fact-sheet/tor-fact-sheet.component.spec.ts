/* eslint-disable camelcase */
/* eslint-disable arrow-parens */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TorFactSheetComponent } from './tor-fact-sheet.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { SimpleTableWithClipboardComponent } from '../../../../shared/components/simple-table-with-clipboard/simple-table-with-clipboard.component';
import { SkeletonModule } from 'primeng/skeleton';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';

describe('TorFactSheetComponent', () => {
  let component: TorFactSheetComponent;
  let fixture: ComponentFixture<TorFactSheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TorFactSheetComponent, SimpleTableWithClipboardComponent],
      imports: [HttpClientTestingModule, SkeletonModule, ProgressBarModule, ToastModule]
    }).compileComponents();

    fixture = TestBed.createComponent(TorFactSheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set data values after API call in ngOnInit', () => {
    // Mock the API call response
    const mockApiResponse = {
      response: {
        initiative_name: 'Test Initiative',
        short_name: 'Test',
        iniative_lead: 'John Doe',
        initiative_deputy: 'Jane Smith',
        action_area: 'Test Area',
        start_date: '2022-01-01',
        end_date: '2023-01-01',
        climateGenderScore: [
          {
            adaptation_score: 5,
            adaptation_desc: 'Adaptation Description',
            mitigation_score: 4,
            mitigation_desc: 'Mitigation Description',
            gender_score: 3,
            gender_desc: 'Gender Description'
          }
        ],
        web_page: 'https://example.com',
        regionsProposal: [{ name: 'Region 1' }, { name: 'Region 2' }],
        countriesProposal: [{ name: 'Country 1' }, { name: 'Country 2' }],
        eoiOutcome: [
          {
            type_name: 'Outcome Type 1',
            result_title: 'Outcome Title 1',
            result_description: 'Outcome Description 1'
          },
          {
            type_name: 'Outcome Type 2',
            result_title: 'Outcome Title 2',
            result_description: 'Outcome Description 2'
          }
        ]
      }
    };

    // Mock the API call
    const apiServiceSpy = jest.spyOn(component.api.resultsSE, 'GET_factSheetByInitiativeId').mockReturnValue(of(mockApiResponse));

    component.ngOnInit();

    expect(apiServiceSpy).toHaveBeenCalled();
    expect(component.data[0].value).toBe('Test Initiative');
    expect(component.data[1].value).toBe('Test');
    expect(component.data[2].value).toBe('John Doe');
    expect(component.data[3].value).toBe('Jane Smith');
    expect(component.data[4].value).toBe('Test Area');
    expect(component.data[5].value).toBe('2022-01-01');
    expect(component.data[6].value).toBe('2023-01-01');
    expect(component.data[9].value).toBe('<strong>5</strong><br>Adaptation Description');
    expect(component.data[10].value).toBe('<strong>4</strong><br>Mitigation Description');
    expect(component.data[11].value).toBe('<strong class="tor-fact-desc">Gender Description</strong><br><strong>Score 3</strong>');
    expect(component.data[12].value).toBe('<a href="https://example.com" target="_blank">https://example.com</a>');
    expect(component.data[7].value).toContain('Region 1');
    expect(component.data[7].value).toContain('Region 2');
    expect(component.data[7].value).toContain('Country 1');
    expect(component.data[7].value).toContain('Country 2');
    expect(component.data[8].value).toContain('Outcome Type 1');
    expect(component.data[8].value).toContain('Outcome Title 1');
    expect(component.data[8].value).toContain('Outcome Description 1');
    expect(component.data[8].value).toContain('Outcome Type 2');
    expect(component.data[8].value).toContain('Outcome Title 2');
    expect(component.data[8].value).toContain('Outcome Description 2');
  });

  it('should convert budget data correctly in convertBudgetData', () => {
    const data = {
      budgetProposal: [
        {
          year: '2022',
          total: 33689134,
          initiative_id: 1
        },
        {
          year: '2023',
          total: 36219700,
          initiative_id: 1
        },
        {
          year: '2024',
          total: 39090866,
          initiative_id: 1
        }
      ],
      budgetAnaPlan: [
        {
          year: '2022',
          total: 26784739
        },
        {
          year: '2023',
          total: 80099997
        },
        {
          year: '2024',
          total: 0
        }
      ]
    };

    component.convertBudgetData(data);

    expect(component.budgetProposal.header).toEqual([
      { attr: '2022', name: '2022', type: 'currency' },
      { attr: '2023', name: '2023', type: 'currency' },
      { attr: '2024', name: '2024', type: 'currency' }
    ]);
    expect(component.budgetProposal.data).toEqual([{ 2022: 33689134, 2023: 36219700, 2024: 39090866 }]);
    expect(component.budgetAnaPlan.header).toEqual([{ attr: '2022', name: '2022', type: 'currency' }]);
    expect(component.budgetAnaPlan.data).toEqual([{ 2022: 26784739 }]);
  });

  it('should concatenate regions and countries correctly in concatGeo', () => {
    const data = {
      regionsProposal: [{ name: 'Region 1' }, { name: 'Region 2' }],
      countriesProposal: [{ name: 'Country 1' }, { name: 'Country 2' }]
    };

    component.concatGeo(data);

    expect(component.data[7].value).toContain('Region 1');
    expect(component.data[7].value).toContain('Region 2');
    expect(component.data[7].value).toContain('Country 1');
    expect(component.data[7].value).toContain('Country 2');
  });

  it('should return no data text if there is no data in concatGeo', () => {
    const data = {
      regionsProposal: [],
      countriesProposal: []
    };

    const noDataText = '<strong>Regions targeted in the proposal:</strong><br><div class="no-data-text-format">This Initiative does not have regions targeted in the proposal</div><br><strong>Countries targeted in the proposal:</strong><br><div class="no-data-text-format">This Initiative does not have countries targeted in the proposal</div>';

    component.concatGeo(data);

    expect(component.data[7].value).toEqual(noDataText);
  });

  it('should concatenate eoi outcomes correctly in concatEoiOutcome', () => {
    const data = {
      eoiOutcome: [
        {
          type_name: 'Outcome Type 1',
          result_title: 'Outcome Title 1',
          result_description: 'Outcome Description 1'
        },
        {
          type_name: 'Outcome Type 2',
          result_title: 'Outcome Title 2',
          result_description: 'Outcome Description 2'
        }
      ]
    };

    component.concatEoiOutcome(data);

    expect(component.data[8].value).toContain('Outcome Type 1');
    expect(component.data[8].value).toContain('Outcome Title 1');
    expect(component.data[8].value).toContain('Outcome Description 1');
    expect(component.data[8].value).toContain('Outcome Type 2');
    expect(component.data[8].value).toContain('Outcome Title 2');
    expect(component.data[8].value).toContain('Outcome Description 2');
  });

  it('should return no data text if there is no data in concatEoiOutcome', () => {
    const data = {
      eoiOutcome: []
    };

    component.concatEoiOutcome(data);

    expect(component.data[8].value).toEqual('<div class="no-data-text-format">This Initiative does not have a Measurable three-year outcome</div>');
  });
});

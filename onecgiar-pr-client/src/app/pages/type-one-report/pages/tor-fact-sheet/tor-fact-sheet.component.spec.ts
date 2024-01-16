/* eslint-disable camelcase */
/* eslint-disable arrow-parens */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TorFactSheetComponent } from './tor-fact-sheet.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SimpleTableWithClipboardComponent } from '../../../../shared/components/simple-table-with-clipboard/simple-table-with-clipboard.component';
import { SkeletonModule } from 'primeng/skeleton';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { of } from 'rxjs';
import { ApiService } from '../../../../shared/services/api/api.service';

describe('TorFactSheetComponent', () => {
  let component: TorFactSheetComponent;
  let fixture: ComponentFixture<TorFactSheetComponent>;
  let mockApiService: any;
  let mockGET_factSheetByInitiativeIdResponse = {
    initiative_name: 'name',
    short_name: 'short name',
    iniative_lead: 'initiative lead',
    initiative_deputy: 'initiative deputy',
    action_area: 'action area',
    start_date: '01-01-2022',
    end_date: '01-01-2023',
    climateGenderScore: [
      {
        adaptation_score: 100,
        adaptation_desc: 'adaptation desc',
        mitigation_score: 200,
        mitigation_desc: 'mitigation desc',
        gender_score: 300,
        gender_desc: 'gender desc'
      }
    ],
    regionsProposal: [
      {
        name: 'Region A'
      }
    ],
    countriesProposal: [
      {
        name: 'Country A'
      }
    ],
    web_page: 'https://link.com',
    budgetProposal: [
      {
        year: 2023,
        total: 10
      }
    ],
    budgetAnaPlan: [
      { year: 2022, total: 800 },
      { year: 2023, total: 1200 },
      { year: 2024, total: 2000 }
    ]
  };

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GET_factSheetByInitiativeId: () => of({ response: mockGET_factSheetByInitiativeIdResponse })
      },
      dataControlSE: {
        myInitiativesList: [
          {
            official_code: 1,
            role: 'role'
          }
        ]
      },
      rolesSE: {
        isAdmin: true
      }
    };

    await TestBed.configureTestingModule({
      declarations: [TorFactSheetComponent, SimpleTableWithClipboardComponent],
      imports: [HttpClientTestingModule, SkeletonModule, ProgressBarModule, ToastModule],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TorFactSheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('ngOnInit()', () => {
    it('should fetch data and update properties on ngOnInit', () => {
      component.ngOnInit();

      expect(component.data[0].value).toBe('name');
      expect(component.data[1].value).toBe('short name');
      expect(component.data[2].value).toBe('initiative lead');
      expect(component.data[3].value).toBe('initiative deputy');
      expect(component.data[4].value).toBe('action area');
      expect(component.data[5].value).toBe('01-01-2022');
      expect(component.data[6].value).toBe('01-01-2023');
      expect(component.data[7].value).toContain('<strong>Regions targeted in the proposal:</strong>');
      expect(component.data[7].value).toContain('Region A');
      expect(component.data[7].value).toContain('<strong>Countries targeted in the proposal:</strong>');
      expect(component.data[7].value).toContain('Country A');
      expect(component.data[9].value).toContain('<strong>100</strong><br>adaptation desc');
      expect(component.data[10].value).toContain('<strong>200</strong><br>mitigation desc');
      expect(component.data[11].value).toContain('<strong class="tor-fact-desc">This score is derived from assessing the Initiative Proposal against adapted OECD gender equity scoring criteria.</strong><br><strong>Score 300</strong><br>gender desc');
      expect(component.data[12].value).toContain('<a href="https://link.com" target="_blank">https://link.com</a>');
      expect(component.loadingData).toBeFalsy();
    });

    it('should fetch data and update properties on ngOnInit when climateGenderScore[0]?.adaptation_score, climateGenderScore[0]?.mitigation_score, and climateGenderScore[0]?.gender_score data?.web_page do not exist', () => {
      component.data = [
        { value: '', category: '' },
        { value: '', category: '' },
        { value: '', category: '' },
        { value: '', category: '' },
        { value: '', category: '' },
        { value: '', category: '' },
        { value: '', category: '' },
        { value: '', category: '' },
        { value: '', category: '' },
        { value: '', category: '' },
        { value: '', category: '' },
        { value: '', category: '' },
        { value: '', category: '' }
      ];
      mockGET_factSheetByInitiativeIdResponse.climateGenderScore[0].adaptation_score = undefined;
      mockGET_factSheetByInitiativeIdResponse.climateGenderScore[0].mitigation_score = undefined;
      mockGET_factSheetByInitiativeIdResponse.climateGenderScore[0].gender_score = undefined;
      mockGET_factSheetByInitiativeIdResponse.web_page = undefined;

      component.ngOnInit();

      expect(component.data[0].value).toBe('name');
      expect(component.data[1].value).toBe('short name');
      expect(component.data[2].value).toBe('initiative lead');
      expect(component.data[3].value).toBe('initiative deputy');
      expect(component.data[4].value).toBe('action area');
      expect(component.data[5].value).toBe('01-01-2022');
      expect(component.data[6].value).toBe('01-01-2023');
      expect(component.data[7].value).toContain('<strong>Regions targeted in the proposal:</strong>');
      expect(component.data[7].value).toContain('Region A');
      expect(component.data[7].value).toContain('<strong>Countries targeted in the proposal:</strong>');
      expect(component.data[7].value).toContain('Country A');
      expect(component.data[9].value).toContain('<div class="no-data-text-format">This Initiative does not have OECD DAC Climate marker Adaptation score</strong>');
      expect(component.data[10].value).toContain('<div class="no-data-text-format">This Initiative does not have OECD DAC Climate marker Mitigation score</strong>');
      expect(component.data[11].value).toContain('<div class="no-data-text-format">This Initiative does not have OECD DAC Gender equity marker score</strong');
      expect(component.data[12].value).toContain('<div class="no-data-text-format">This Initiative does not have Links to webpage</strong>');
      expect(component.loadingData).toBeFalsy();
    });
  });

  describe('convertBudgetData()', () => {
    it('should convert budget data for budgetProposal', () => {
      component.budgetAnaPlan = {
        header: [],
        data: []
      };
      const data = {
        budgetProposal: [
          {
            year: 2023,
            total: 10
          }
        ],
        budgetAnaPlan: [
          { year: 2020, total: 800 },
          { year: 2021, total: 1200 },
          { year: 2022, total: 2000 }
        ]
      };

      component.convertBudgetData(data);

      expect(component.budgetProposal.header).toEqual([
        { attr: 2023, name: 2023, type: 'currency' },
        { attr: 2023, name: 2023, type: 'currency' }
      ]);
      expect(component.budgetProposal.data).toEqual([{ '2023': 10 }, { '2023': 10 }]);
    });
  });

  describe('concatGeo()', () => {
    it('should concatenate regions and countries targeted in the proposal with correct HTML structure', () => {
      component.data[7].value = '';
      const data = {
        regionsProposal: [{ name: 'Region1' }, { name: 'Region2' }],
        countriesProposal: [{ name: 'Country1' }, { name: 'Country2' }]
      };

      component.concatGeo(data);

      const expectedResult = '<strong>Regions targeted in the proposal:</strong><br>Region1; Region2<br><br><strong>Countries targeted in the proposal:</strong><br>Country1; Country2<br>';

      expect(component.data[7].value).toEqual(expectedResult);
    });
    it('should handle the case when there are no regions and countries targeted in the proposal', () => {
      component.data[7].value = '';
      const data = {
        regionsProposal: [],
        countriesProposal: []
      };

      component.concatGeo(data);

      const expectedResult = '<strong>Regions targeted in the proposal:</strong><br><div class="no-data-text-format">This Initiative does not have regions targeted in the proposal</div><br><strong>Countries targeted in the proposal:</strong><br><div class="no-data-text-format">This Initiative does not have regions targeted in the proposal</div>';

      expect(component.data[7].value).toEqual(expectedResult);
    });
  });

  describe('concatEoiOutcome()', () => {
    it('should concatenate EOI outcomes with correct HTML structure', () => {
      component.data[8].value = '';
      const data = {
        eoiOutcome: [
          {
            type_name: 'Type1',
            result_title: 'Result1',
            result_description: 'Description1'
          },
          {
            type_name: 'Type2',
            result_title: 'Result2',
            result_description: 'Description2'
          }
        ]
      };

      component.concatEoiOutcome(data);

      const expectedResult = '<strong>Type1 - Result1</strong><br><strong>Description:</strong> Description1<br><br><strong>Type2 - Result2</strong><br><strong>Description:</strong> Description2<br><br>';

      expect(component.data[8].value).toEqual(expectedResult);
    });

    it('should handle the case when there are no EOI outcomes', () => {
      component.data[8].value = '';

      const data = {
        eoiOutcome: []
      };

      component.concatEoiOutcome(data);

      const expectedResult = '<div class="no-data-text-format">This Initiative does not have a Measurable three-year outcome</div>';

      expect(component.data[8].value).toEqual(expectedResult);
    });
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

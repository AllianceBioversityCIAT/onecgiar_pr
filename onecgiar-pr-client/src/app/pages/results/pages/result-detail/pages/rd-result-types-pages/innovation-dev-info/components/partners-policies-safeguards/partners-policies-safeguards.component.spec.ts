import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { PartnersPoliciesSafeguardsComponent } from './partners-policies-safeguards.component';
import { InnovationDevInfoUtilsService } from '../../services/innovation-dev-info-utils.service';

describe('PartnersPoliciesSafeguardsComponent', () => {
  let component: PartnersPoliciesSafeguardsComponent;
  let fixture: ComponentFixture<PartnersPoliciesSafeguardsComponent>;

  beforeEach(async () => {
    const mockUtils = { mapBoolean: jest.fn() } as any;

    await TestBed.configureTestingModule({
      declarations: [PartnersPoliciesSafeguardsComponent],
      providers: [{ provide: InnovationDevInfoUtilsService, useValue: mockUtils }],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(PartnersPoliciesSafeguardsComponent);
    component = fixture.componentInstance;
    (component as any).options = {
      responsible_innovation_and_scaling: {
        q4: {
          question_text: 'q4',
          question_description: 'desc',
          options: [{ result_question_id: '1', question_text: 'Yes' }]
        }
      }
    } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});



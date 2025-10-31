import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { AssumptionsExaminationComponent } from './assumptions-examination.component';
import { InnovationDevInfoUtilsService } from '../../services/innovation-dev-info-utils.service';

describe('AssumptionsExaminationComponent', () => {
  let component: AssumptionsExaminationComponent;
  let fixture: ComponentFixture<AssumptionsExaminationComponent>;

  beforeEach(async () => {
    const mockUtils = { mapBoolean: jest.fn() } as any;

    await TestBed.configureTestingModule({
      declarations: [AssumptionsExaminationComponent],
      providers: [{ provide: InnovationDevInfoUtilsService, useValue: mockUtils }],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(AssumptionsExaminationComponent);
    component = fixture.componentInstance;
    (component as any).options = {
      responsible_innovation_and_scaling: {
        q3: {
          question_text: 'q3',
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



import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AiLoadingStateComponent } from './ai-loading-state.component';
import { CommonModule } from '@angular/common';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';
import { AiLoadingStateService } from './services/ai-loading-state.service';

describe('AiLoadingStateComponent', () => {
  let component: AiLoadingStateComponent;
  let fixture: ComponentFixture<AiLoadingStateComponent>;
  let aiLoadingStateServiceMock: Partial<AiLoadingStateService>;

  beforeEach(async () => {
    aiLoadingStateServiceMock = {
      startLoadingProgress: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [CommonModule, CustomFieldsModule],
      providers: [{ provide: AiLoadingStateService, useValue: aiLoadingStateServiceMock }]
    }).compileComponents();

    fixture = TestBed.createComponent(AiLoadingStateComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

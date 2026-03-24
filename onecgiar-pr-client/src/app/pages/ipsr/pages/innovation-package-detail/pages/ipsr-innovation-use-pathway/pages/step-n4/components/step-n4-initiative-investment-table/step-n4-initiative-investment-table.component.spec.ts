import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN4InitiativeInvestmentTableComponent } from './step-n4-initiative-investment-table.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TermPipe } from '../../../../../../../../../../internationalization/term.pipe';

describe('StepN4InitiativeInvestmentTableComponent', () => {
  let component: StepN4InitiativeInvestmentTableComponent;
  let fixture: ComponentFixture<StepN4InitiativeInvestmentTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StepN4InitiativeInvestmentTableComponent],
      imports: [HttpClientTestingModule, TermPipe]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN4InitiativeInvestmentTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

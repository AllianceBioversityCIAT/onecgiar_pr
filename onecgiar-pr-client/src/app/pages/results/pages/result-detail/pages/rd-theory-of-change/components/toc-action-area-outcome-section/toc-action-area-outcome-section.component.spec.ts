import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TocActionAreaOutcomeSectionComponent } from './toc-action-area-outcome-section.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoDataTextComponent } from '../../../../../../../../custom-fields/no-data-text/no-data-text.component';
import { TocInitiativeAaoComponent } from '../shared/toc-initiative-aao/toc-initiative-aao.component';
import { PrFieldHeaderComponent } from '../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { AlertStatusComponent } from '../../../../../../../../custom-fields/alert-status/alert-status.component';

describe('TocActionAreaOutcomeSectionComponent', () => {
  let component: TocActionAreaOutcomeSectionComponent;
  let fixture: ComponentFixture<TocActionAreaOutcomeSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        TocActionAreaOutcomeSectionComponent,
        TocInitiativeAaoComponent,
        PrFieldHeaderComponent,
        NoDataTextComponent,
        AlertStatusComponent
      ],
      imports: [
        HttpClientTestingModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TocActionAreaOutcomeSectionComponent);
    component = fixture.componentInstance;

  });

  it('should initialize resultActionArea array', () => {
    expect(component.theoryOfChangesServices.resultActionArea).toEqual([]);
  });
});

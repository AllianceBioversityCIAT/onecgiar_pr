import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TocInitiativeOutputSectionComponent } from './toc-initiative-output-section.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TocInitiativeOutComponent } from '../shared/toc-initiative-out/toc-initiative-out.component';
import { PrFieldHeaderComponent } from '../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrYesOrNotComponent } from '../../../../../../../../custom-fields/pr-yes-or-not/pr-yes-or-not.component';
import { FormsModule } from '@angular/forms';
import { resultToResultInterfaceToc } from '../../model/theoryOfChangeBody';


describe('TocInitiativeOutputSectionComponent', () => {
  let component: TocInitiativeOutputSectionComponent;
  let fixture: ComponentFixture<TocInitiativeOutputSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ 
        TocInitiativeOutputSectionComponent,
        TocInitiativeOutComponent,
        PrFieldHeaderComponent,
        PrYesOrNotComponent
      ],
      imports: [
        HttpClientTestingModule,
        FormsModule
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(TocInitiativeOutputSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should have the correct inputs', () => {
    const resultTocResult = new resultToResultInterfaceToc();
    const contributorsResultTocResult = {};

    component.result_toc_result = resultTocResult;
    component.contributors_result_toc_result = contributorsResultTocResult;

    fixture.detectChanges();

    expect(component.result_toc_result).toEqual(resultTocResult);
    expect(component.contributors_result_toc_result).toEqual(contributorsResultTocResult);
  });
});

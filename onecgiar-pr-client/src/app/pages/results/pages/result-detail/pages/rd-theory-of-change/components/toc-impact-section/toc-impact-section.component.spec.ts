import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TocImpactSectionComponent } from './toc-impact-section.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrFieldHeaderComponent } from '../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';

describe('TocImpactSectionComponent', () => {
  let component: TocImpactSectionComponent;
  let fixture: ComponentFixture<TocImpactSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        TocImpactSectionComponent,
        PrFieldHeaderComponent
      ],
      imports: [
        HttpClientTestingModule
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(TocImpactSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('getLabel()', () => {
    it('should get label with the correct full name', () => {
      const fullName = 'Example Name';
      const label = component.getLabel(fullName);

      expect(label).toBe(`Is this result planned in the ${fullName} SAPLING ToC?:`);
    });
  });
});

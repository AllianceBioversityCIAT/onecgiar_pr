import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { SubGeoscopeComponent } from './sub-geoscope.component';
import { PrSelectComponent } from '../../../../../../../../custom-fields/pr-select/pr-select.component';
import { LabelNamePipe } from '../../../../../../../../custom-fields/pr-select/label-name.pipe';
import { ListFilterByTextAndAttrPipe } from '../../../../../../../../custom-fields/pr-multi-select/pipes/list-filter-by-text-and-attr.pipe';

describe('SubGeoscopeComponent', () => {
  let component: SubGeoscopeComponent;
  let fixture: ComponentFixture<SubGeoscopeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SubGeoscopeComponent, PrSelectComponent, LabelNamePipe, ListFilterByTextAndAttrPipe],
      imports: [HttpClientTestingModule, ScrollingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(SubGeoscopeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

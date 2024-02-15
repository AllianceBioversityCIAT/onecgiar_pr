import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TorKeyResultsComponent } from './tor-key-results.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('TorKeyResultsComponent', () => {
  let component: TorKeyResultsComponent;
  let fixture: ComponentFixture<TorKeyResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TorKeyResultsComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(TorKeyResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have keyResultsDesc property', () => {
    expect(component.keyResultsDesc).toBeDefined();
  });

  it('should have correct keyResultsDesc value', () => {
    const expectedValue = `This section provides an overview of results reported by the CGIAR Initiative on [Initiative short name]. These results align with the CGIAR Results Framework and [Initiative short name’s] theory of change. Further information on these results is available through the CGIAR Results Dashboard.
  The following diagrams have been produced using quality assessed results entered into the CGIAR reporting system and are based on data extracted on February 20, 2024.`;

    expect(component.keyResultsDesc).toEqual(expectedValue);
  });
});

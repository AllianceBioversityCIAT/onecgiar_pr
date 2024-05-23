import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TorKrsPrimaryImpactAreaSelectorComponent } from './tor-krs-primary-impact-area-selector.component';
import { HttpClientModule } from '@angular/common/http';

describe('TorKrsPrimaryImpactAreaSelectorComponent', () => {
  let component: TorKrsPrimaryImpactAreaSelectorComponent;
  let fixture: ComponentFixture<TorKrsPrimaryImpactAreaSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TorKrsPrimaryImpactAreaSelectorComponent],
      imports: [HttpClientModule]
    }).compileComponents();

    fixture = TestBed.createComponent(TorKrsPrimaryImpactAreaSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

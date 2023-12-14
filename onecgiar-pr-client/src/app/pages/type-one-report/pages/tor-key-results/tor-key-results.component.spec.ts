import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TorKeyResultsComponent } from './tor-key-results.component';

describe('TorKeyResultsComponent', () => {
  let component: TorKeyResultsComponent;
  let fixture: ComponentFixture<TorKeyResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TorKeyResultsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TorKeyResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TorInitProgressAndKeyResultsComponent } from './tor-init-progress-and-key-results.component';

describe('TorInitProgressAndKeyResultsComponent', () => {
  let component: TorInitProgressAndKeyResultsComponent;
  let fixture: ComponentFixture<TorInitProgressAndKeyResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TorInitProgressAndKeyResultsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TorInitProgressAndKeyResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

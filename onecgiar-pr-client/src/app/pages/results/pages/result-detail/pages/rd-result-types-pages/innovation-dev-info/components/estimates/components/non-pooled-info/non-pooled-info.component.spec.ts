import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NonPooledInfoComponent } from './non-pooled-info.component';

describe('NonPooledInfoComponent', () => {
  let component: NonPooledInfoComponent;
  let fixture: ComponentFixture<NonPooledInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NonPooledInfoComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NonPooledInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

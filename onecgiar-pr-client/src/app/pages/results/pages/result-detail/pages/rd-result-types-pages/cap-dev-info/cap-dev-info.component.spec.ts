import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CapDevInfoComponent } from './cap-dev-info.component';

describe('CapDevInfoComponent', () => {
  let component: CapDevInfoComponent;
  let fixture: ComponentFixture<CapDevInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CapDevInfoComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CapDevInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

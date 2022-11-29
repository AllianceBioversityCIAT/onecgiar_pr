import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartnersRequestComponent } from './partners-request.component';

describe('PartnersRequestComponent', () => {
  let component: PartnersRequestComponent;
  let fixture: ComponentFixture<PartnersRequestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PartnersRequestComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PartnersRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

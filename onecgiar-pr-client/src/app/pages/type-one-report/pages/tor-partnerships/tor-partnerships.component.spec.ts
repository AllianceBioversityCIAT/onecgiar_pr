import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TorPartnershipsComponent } from './tor-partnerships.component';

describe('TorPartnershipsComponent', () => {
  let component: TorPartnershipsComponent;
  let fixture: ComponentFixture<TorPartnershipsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TorPartnershipsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TorPartnershipsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

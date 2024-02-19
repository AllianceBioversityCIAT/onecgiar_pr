import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TorPartnershipsComponent } from './tor-partnerships.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('TorPartnershipsComponent', () => {
  let component: TorPartnershipsComponent;
  let fixture: ComponentFixture<TorPartnershipsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TorPartnershipsComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(TorPartnershipsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

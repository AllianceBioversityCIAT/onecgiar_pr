import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RdContributorsAndPartnersComponent } from './rd-contributors-and-partners.component';

describe('RdContributorsAndPartnersComponent', () => {
  let component: RdContributorsAndPartnersComponent;
  let fixture: ComponentFixture<RdContributorsAndPartnersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RdContributorsAndPartnersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RdContributorsAndPartnersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

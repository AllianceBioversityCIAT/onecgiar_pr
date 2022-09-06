import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RdContributorsComponent } from './rd-contributors.component';

describe('RdContributorsComponent', () => {
  let component: RdContributorsComponent;
  let fixture: ComponentFixture<RdContributorsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RdContributorsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RdContributorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

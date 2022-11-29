import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShareRequestModalComponent } from './share-request-modal.component';

describe('ShareRequestModalComponent', () => {
  let component: ShareRequestModalComponent;
  let fixture: ComponentFixture<ShareRequestModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ShareRequestModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShareRequestModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

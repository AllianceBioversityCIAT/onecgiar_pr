import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CookiesDialogComponent } from './cookies-dialog.component';

describe('CookiesDialogComponent', () => {
  let component: CookiesDialogComponent;
  let fixture: ComponentFixture<CookiesDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CookiesDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CookiesDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { CookiesDialogComponent } from './cookies-dialog.component';

describe('CookiesDialogComponent', () => {
  let component: CookiesDialogComponent;
  let fixture: ComponentFixture<CookiesDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CookiesDialogComponent, HttpClientTestingModule, BrowserAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(CookiesDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

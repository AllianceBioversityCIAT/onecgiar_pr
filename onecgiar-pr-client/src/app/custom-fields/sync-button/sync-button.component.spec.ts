import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SyncButtonComponent } from './sync-button.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('SyncButtonComponent', () => {
  let component: SyncButtonComponent;
  let fixture: ComponentFixture<SyncButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SyncButtonComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(SyncButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SkeletonNotificationItemComponent } from './skeleton-notification-item.component';
import { SkeletonModule } from 'primeng/skeleton';
import { CommonModule } from '@angular/common';

describe('SkeletonNotificationItemComponent', () => {
  let component: SkeletonNotificationItemComponent;
  let fixture: ComponentFixture<SkeletonNotificationItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, SkeletonModule]
    }).compileComponents();
    fixture = TestBed.createComponent(SkeletonNotificationItemComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

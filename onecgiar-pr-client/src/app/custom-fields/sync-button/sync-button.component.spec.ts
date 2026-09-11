import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SyncButtonComponent } from './sync-button.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SectionBottomBarSlotService } from '../../pages/results/pages/result-detail/components/section-bottom-bar/section-bottom-bar-slot.service';

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

  it('teleports into syncSlot when SectionBottomBarSlotService provides a slot', () => {
    const slotSE = TestBed.inject(SectionBottomBarSlotService);
    const hostEl = document.createElement('div');
    document.body.appendChild(hostEl);
    slotSE.syncSlot.set(hostEl);
    fixture.detectChanges();

    expect(hostEl.contains(fixture.nativeElement)).toBe(true);
    expect(component.inBottomBar()).toBe(true);
    hostEl.remove();
  });
});

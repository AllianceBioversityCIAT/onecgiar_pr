import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';

import { CPKnowledgeProductSelectorComponent } from './knowledge-product-selector.component';
import { AlertStatusComponent } from '../../../../../../../../../../custom-fields/alert-status/alert-status.component';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';

describe('CPKnowledgeProductSelectorComponent', () => {
  let component: CPKnowledgeProductSelectorComponent;
  let fixture: ComponentFixture<CPKnowledgeProductSelectorComponent>;
  let api: ApiService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CPKnowledgeProductSelectorComponent, AlertStatusComponent],
      imports: [HttpClientTestingModule, FormsModule],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    api = TestBed.inject(ApiService);

    fixture = TestBed.createComponent(CPKnowledgeProductSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // P2-3301 follow-up: P25 has no navigable Theory of Change section, so the "Section 2, Theory of
  // Change" deep link (P22-only copy, and wrong even there since P25's own section 2 is this
  // Contributors & partners screen) was dropped rather than re-fixed. This pins the note down to the
  // partner-organizations sentence only, with no `open_route` link and no `resultCode`/`versionId`.
  describe('Theory of Change note removal (P2-3301 follow-up)', () => {
    it('renders the partner-organizations note with no Theory of Change link', () => {
      const alert: HTMLElement = fixture.nativeElement.querySelector('app-alert-status');

      expect(component.alertStatusMessage).toBe(
        'Partner organizations you collaborated with or are currently collaborating with to generate this result.'
      );
      expect(alert.querySelector('a.open_route')).toBeNull();
    });

    it('does not expose resultCode/versionId anymore', () => {
      expect((component as any).resultCode).toBeUndefined();
      expect((component as any).versionId).toBeUndefined();
    });
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { AiReviewComponent } from './ai-review.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DacScores } from '../../../../../../shared/services/api/ai-review.service';
import { CustomizedAlertsFeService } from '../../../../../../shared/services/customized-alerts-fe.service';
import { PrInputComponent } from '../../../../../../custom-fields/pr-input/pr-input.component';

describe('AiReviewComponent', () => {
  let component: AiReviewComponent;
  let fixture: ComponentFixture<AiReviewComponent>;
  let alertSpy: jest.SpyInstance;

  const buildDacScore = (overrides: Partial<DacScores> = {}): DacScores => ({
    field_name: 'climate',
    display_title: 'Climate adaptation and mitigation',
    tag_id: '3',
    impact_area_id: [],
    canSave: false,
    is_validated: false,
    user_validated: false,
    ...overrides
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiReviewComponent, HttpClientTestingModule],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(AiReviewComponent);
    component = fixture.componentInstance;
    alertSpy = jest.spyOn(TestBed.inject(CustomizedAlertsFeService), 'show').mockImplementation(() => undefined);
    component.aiReviewSE.dataControlSE.currentResultSignal.set({ id: 123 } as any);
    fixture.detectChanges();
  });

  afterEach(() => jest.restoreAllMocks());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('component selection', () => {
    it('should keep both components selected when two are toggled', () => {
      const dacScore = buildDacScore();

      component.onComponentChange(dacScore, 10);
      component.onComponentChange(dacScore, 11);

      expect(dacScore.impact_area_id).toEqual([10, 11]);
      expect(component.isComponentSelected(dacScore, 10)).toBe(true);
      expect(component.isComponentSelected(dacScore, 11)).toBe(true);
      expect(dacScore.canSave).toBe(true);
    });

    it('should remove only the clicked component when it was already selected', () => {
      const dacScore = buildDacScore({ impact_area_id: [10, 11] });

      component.onComponentChange(dacScore, 10);

      expect(dacScore.impact_area_id).toEqual([11]);
      expect(component.isComponentSelected(dacScore, 10)).toBe(false);
    });

    it('should match ids regardless of string or number type', () => {
      const dacScore = buildDacScore({ impact_area_id: ['10'] });

      expect(component.isComponentSelected(dacScore, 10)).toBe(true);
    });

    it('should clear the component list when the score leaves Principal', () => {
      const dacScore = buildDacScore({ impact_area_id: [10, 11] });

      component.onResultVersionChange(dacScore, '2');

      expect(dacScore.impact_area_id).toEqual([]);
      expect(component.isPrincipal(dacScore)).toBe(false);
      expect(dacScore.canSave).toBe(true);
    });

    it('should keep the component list when the score stays Principal', () => {
      const dacScore = buildDacScore({ impact_area_id: [10] });

      component.onResultVersionChange(dacScore, '3');

      expect(dacScore.impact_area_id).toEqual([10]);
      expect(component.isPrincipal(dacScore)).toBe(true);
    });
  });

  describe('validation badge', () => {
    it('should be validated when the AI approved the card and nothing changed', () => {
      expect(component.isCardValidated(buildDacScore({ is_validated: true }))).toBe(true);
    });

    it('should be validated after the user persisted a change', () => {
      expect(component.isCardValidated(buildDacScore({ user_validated: true }))).toBe(true);
    });

    it('should return to needs improvement while there are unsaved edits', () => {
      expect(component.isCardValidated(buildDacScore({ is_validated: true, canSave: true }))).toBe(false);
    });
  });

  describe('onSaveDacScore', () => {
    it('should block the save when Principal has no component selected', async () => {
      const saveSpy = jest.spyOn(component.aiReviewSE, 'PATCH_saveDacScore');
      const dacScore = buildDacScore({ canSave: true });

      await component.onSaveDacScore(dacScore);

      expect(saveSpy).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
      expect(dacScore.canSave).toBe(true);
    });

    it('should send the full component list and mark the card as validated', async () => {
      const saveSpy = jest.spyOn(component.aiReviewSE, 'PATCH_saveDacScore').mockResolvedValue({} as any);
      const dacScore = buildDacScore({ impact_area_id: ['10', 11], canSave: true });

      await component.onSaveDacScore(dacScore);

      expect(saveSpy).toHaveBeenCalledWith(123, {
        field_name: 'climate',
        tag_id: 3,
        impact_area_id: [10, 11],
        change_reason: 'Updated after AI review section'
      });
      expect(dacScore.canSave).toBe(false);
      expect(dacScore.user_validated).toBe(true);
    });

    it('should send an empty list when the score is not Principal', async () => {
      const saveSpy = jest.spyOn(component.aiReviewSE, 'PATCH_saveDacScore').mockResolvedValue({} as any);

      await component.onSaveDacScore(buildDacScore({ tag_id: '2', impact_area_id: [10], canSave: true }));

      expect(saveSpy).toHaveBeenCalledWith(123, expect.objectContaining({ tag_id: 2, impact_area_id: [] }));
    });

    it('should keep the card pending and warn the user when the request fails', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      jest.spyOn(component.aiReviewSE, 'PATCH_saveDacScore').mockRejectedValue(new Error('boom'));
      const dacScore = buildDacScore({ impact_area_id: [10], canSave: true });

      await component.onSaveDacScore(dacScore);

      expect(dacScore.canSave).toBe(true);
      expect(alertSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
    });
  });

  describe('Fields section — unsaved-proposal reminder', () => {
    const buildField = (overrides: Partial<any> = {}) => ({
      field_name: 'title',
      field_name_label: 'Title',
      original_text: 'Current title',
      proposed_text: 'Proposed title',
      canSave: false,
      ...overrides
    });

    it('should show the reminder only for a field that has an unsaved applied proposal (AIR-AC-3/AIR-AC-4)', () => {
      component.aiReviewSE.showAiReview.set(true);
      // Two fields side by side, differing only in `canSave` — proves the `@if` actually reacts to
      // the flag (one renders the reminder, the other doesn't) rather than always/never rendering.
      component.aiReviewSE.currnetFieldsList.set([
        buildField({ field_name: 'title', canSave: true }),
        buildField({ field_name: 'innovation_short_title', canSave: false })
      ]);

      fixture.detectChanges();

      expect(fixture.nativeElement.querySelectorAll('.unsaved-proposal-reminder').length).toBe(1);
    });

    it('should re-enable Save changes when the field is edited directly after a save (AIR-AC-5)', () => {
      component.aiReviewSE.showAiReview.set(true);
      component.aiReviewSE.currnetFieldsList.set([buildField({ canSave: false })]);

      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.unsaved-proposal-reminder')).toBeNull();

      const prInput = fixture.debugElement.query(By.directive(PrInputComponent)).componentInstance as PrInputComponent;
      prInput.value = 'Edited directly';
      fixture.detectChanges();

      expect(component.aiReviewSE.currnetFieldsList()[0].canSave).toBe(true);
      expect(fixture.nativeElement.querySelector('.unsaved-proposal-reminder')).not.toBeNull();
    });
  });

  describe('Impact Areas section — bulk Validate control removed', () => {
    it('should render the Impact Areas section and its per-card Save buttons, but never a bulk Validate button', () => {
      // Open the dialog: app-pr-dialog only instantiates its projected content when visible.
      component.aiReviewSE.showAiReview.set(true);
      component.aiReviewSE.dacScores.set([buildDacScore({ canSave: true }), buildDacScore({ field_name: 'gender' })]);

      fixture.detectChanges();

      // Positive control: the section really rendered — without this, the negative assertion
      // below would pass vacuously even if the dialog never opened.
      expect(fixture.nativeElement.querySelector('.impact-areas-section')).not.toBeNull();
      // Positive control: the per-card Save button (AIR-R-2) survives, one per dacScore.
      expect(fixture.nativeElement.querySelectorAll('.save-button-custom').length).toBe(2);
      // The actual assertion under test (AIR-R-1 / AIR-AC-1): no bulk Validate control.
      expect(fixture.nativeElement.querySelector('.validate-all-button')).toBeNull();
    });
  });

  describe('getComponentListByFieldName', () => {
    it('should return an empty list for an unknown impact area', () => {
      expect(component.getComponentListByFieldName('unknown')).toEqual([]);
    });

    it('should return the catalog matching the impact area', () => {
      const climateList = [{ id: '10', name: 'Adaptation' }] as any;
      component.getImpactAreasScoresComponents.climateTagScoreList.set(climateList);

      expect(component.getComponentListByFieldName('climate')).toEqual(climateList);
    });
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AiReviewComponent } from './ai-review.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DacScores } from '../../../../../../shared/services/api/ai-review.service';
import { CustomizedAlertsFeService } from '../../../../../../shared/services/customized-alerts-fe.service';

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

  describe('onValidateAll', () => {
    it('should expose pending changes only for cards with unsaved edits', () => {
      component.aiReviewSE.dacScores.set([buildDacScore({ canSave: true }), buildDacScore({ field_name: 'gender' })]);

      expect(component.hasPendingChanges).toBe(true);
      expect(component.pendingDacScores).toHaveLength(1);
    });

    it('should do nothing when there is nothing pending', async () => {
      const saveSpy = jest.spyOn(component.aiReviewSE, 'PATCH_saveDacScore');
      component.aiReviewSE.dacScores.set([buildDacScore()]);

      await component.onValidateAll();

      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('should persist every pending card and skip the ones already saved', async () => {
      const saveSpy = jest.spyOn(component.aiReviewSE, 'PATCH_saveDacScore').mockResolvedValue({} as any);
      component.aiReviewSE.dacScores.set([
        buildDacScore({ field_name: 'climate', impact_area_id: [10], canSave: true }),
        buildDacScore({ field_name: 'gender', impact_area_id: [20], canSave: true }),
        buildDacScore({ field_name: 'poverty', impact_area_id: [30], canSave: false })
      ]);

      await component.onValidateAll();

      expect(saveSpy).toHaveBeenCalledTimes(2);
      expect(component.hasPendingChanges).toBe(false);
      expect(alertSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
    });

    it('should report the incomplete cards and leave them pending', async () => {
      const saveSpy = jest.spyOn(component.aiReviewSE, 'PATCH_saveDacScore').mockResolvedValue({} as any);
      const incomplete = buildDacScore({ field_name: 'gender', impact_area_id: [], canSave: true });
      component.aiReviewSE.dacScores.set([buildDacScore({ impact_area_id: [10], canSave: true }), incomplete]);

      await component.onValidateAll();

      expect(saveSpy).toHaveBeenCalledTimes(1);
      expect(incomplete.canSave).toBe(true);
      expect(alertSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'error', title: 'Component required' }));
    });

    it('should keep a failing card pending and report it', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const failing = buildDacScore({ field_name: 'gender', impact_area_id: [20], canSave: true });
      jest
        .spyOn(component.aiReviewSE, 'PATCH_saveDacScore')
        .mockResolvedValueOnce({} as any)
        .mockRejectedValueOnce(new Error('boom'));
      component.aiReviewSE.dacScores.set([buildDacScore({ impact_area_id: [10], canSave: true }), failing]);

      await component.onValidateAll();

      expect(failing.canSave).toBe(true);
      expect(alertSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Some changes were not saved' }));
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

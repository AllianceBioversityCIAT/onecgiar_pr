// @akili-spec changes/mass-reporting-flow
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AiNarrativeComponent } from './ai-narrative.component';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { PrToastComponent } from 'src/app/shared/components/pr-toast';
import { GlobalVariablesService } from '../../../../shared/services/global-variables.service';
import { RolesService } from '../../../../shared/services/global/roles.service';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../shared/services/api/api.service';

describe('AiNarrativeComponent', () => {
  let component: AiNarrativeComponent;
  let fixture: ComponentFixture<AiNarrativeComponent>;
  let globalVariablesService: GlobalVariablesService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AiNarrativeComponent],
      imports: [HttpClientTestingModule, CustomFieldsModule, PrToastComponent],
      providers: [GlobalVariablesService, ApiService, RolesService]
    }).compileComponents();

    fixture = TestBed.createComponent(AiNarrativeComponent);
    component = fixture.componentInstance;
    globalVariablesService = TestBed.inject(GlobalVariablesService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should read the enabled flag and prompt from the global variables store', () => {
      globalVariablesService.get.ai_narrative_enabled = true;
      globalVariablesService.get.ai_narrative_prompt = 'Existing prompt {{aow}} {{stats}} {{hlos}}';

      component.ngOnInit();

      expect(component.aiNarrativeEnabled).toBe(true);
      expect(component.previousAiNarrativeEnabled).toBe(true);
      expect(component.aiNarrativePrompt).toEqual('Existing prompt {{aow}} {{stats}} {{hlos}}');
      expect(component.previousAiNarrativePrompt).toEqual('Existing prompt {{aow}} {{stats}} {{hlos}}');
    });

    it('should default to false/empty when the store has no values yet', () => {
      globalVariablesService.get.ai_narrative_enabled = undefined;
      globalVariablesService.get.ai_narrative_prompt = undefined;

      component.ngOnInit();

      expect(component.aiNarrativeEnabled).toBe(false);
      expect(component.aiNarrativePrompt).toEqual('');
    });
  });

  describe('rendering with RolesService.readOnly = true (admin card must stay interactive)', () => {
    it('should still render the toggle choices and the prompt textarea', () => {
      const rolesService = TestBed.inject(RolesService);
      rolesService.readOnly = true;

      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const choices = compiled.querySelectorAll('.choice');
      const textarea = compiled.querySelector('textarea');

      expect(choices.length).toBe(2);
      expect(textarea).toBeTruthy();
    });
  });

  describe('onSave', () => {
    it('should issue one PUT for the flag only when just the flag changed', () => {
      const putSpy = jest.spyOn(component.api.resultsSE, 'PUT_updateGlobalVariable').mockReturnValue(of({ response: {} }));

      component.previousAiNarrativeEnabled = false;
      component.aiNarrativeEnabled = true;
      component.previousAiNarrativePrompt = 'same prompt';
      component.aiNarrativePrompt = 'same prompt';

      component.onSave();

      expect(putSpy).toHaveBeenCalledTimes(1);
      expect(putSpy).toHaveBeenCalledWith({ name: 'ai_narrative_enabled', value: '1' });
      expect(component.isLoading).toBe(false);
      expect(globalVariablesService.get.ai_narrative_enabled).toBe(true);
      expect(component.previousAiNarrativeEnabled).toBe(true);
    });

    it('should issue one PUT for the prompt only when just the prompt changed', () => {
      const putSpy = jest.spyOn(component.api.resultsSE, 'PUT_updateGlobalVariable').mockReturnValue(of({ response: {} }));

      component.previousAiNarrativeEnabled = false;
      component.aiNarrativeEnabled = false;
      component.previousAiNarrativePrompt = 'old prompt';
      component.aiNarrativePrompt = 'new prompt {{aow}} {{stats}} {{hlos}}';

      component.onSave();

      expect(putSpy).toHaveBeenCalledTimes(1);
      expect(putSpy).toHaveBeenCalledWith({ name: 'ai_narrative_prompt', value: 'new prompt {{aow}} {{stats}} {{hlos}}' });
      expect(globalVariablesService.get.ai_narrative_prompt).toEqual('new prompt {{aow}} {{stats}} {{hlos}}');
      expect(component.previousAiNarrativePrompt).toEqual('new prompt {{aow}} {{stats}} {{hlos}}');
    });

    it('should issue two PUTs — one per changed parameter — when both change', () => {
      const putSpy = jest.spyOn(component.api.resultsSE, 'PUT_updateGlobalVariable').mockReturnValue(of({ response: {} }));

      component.previousAiNarrativeEnabled = false;
      component.aiNarrativeEnabled = true;
      component.previousAiNarrativePrompt = 'old prompt';
      component.aiNarrativePrompt = 'new prompt';

      component.onSave();

      expect(putSpy).toHaveBeenCalledTimes(2);
      expect(putSpy).toHaveBeenCalledWith({ name: 'ai_narrative_enabled', value: '1' });
      expect(putSpy).toHaveBeenCalledWith({ name: 'ai_narrative_prompt', value: 'new prompt' });
    });

    it('should call PUT with the disabled value as the string "0"', () => {
      const putSpy = jest.spyOn(component.api.resultsSE, 'PUT_updateGlobalVariable').mockReturnValue(of({ response: {} }));

      component.previousAiNarrativeEnabled = true;
      component.aiNarrativeEnabled = false;
      component.previousAiNarrativePrompt = 'same';
      component.aiNarrativePrompt = 'same';

      component.onSave();

      expect(putSpy).toHaveBeenCalledWith({ name: 'ai_narrative_enabled', value: '0' });
    });

    it('should not call PUT when nothing changed', () => {
      const putSpy = jest.spyOn(component.api.resultsSE, 'PUT_updateGlobalVariable');

      component.previousAiNarrativeEnabled = true;
      component.aiNarrativeEnabled = true;
      component.previousAiNarrativePrompt = 'same prompt';
      component.aiNarrativePrompt = 'same prompt';

      component.onSave();

      expect(putSpy).not.toHaveBeenCalled();
      expect(component.isLoading).toBe(false);
    });

    it('should handle an error from the PUT call and name the failed parameter in the toast', () => {
      const putSpy = jest
        .spyOn(component.api.resultsSE, 'PUT_updateGlobalVariable')
        .mockReturnValue(throwError(() => ({ error: 'Error occurred' })));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const messageServiceAddSpy = jest.spyOn((component as any).messageService, 'add');

      component.previousAiNarrativeEnabled = false;
      component.aiNarrativeEnabled = true;
      component.previousAiNarrativePrompt = 'same';
      component.aiNarrativePrompt = 'same';

      component.onSave();

      expect(component.isLoading).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith({ error: 'Error occurred' });
      expect(putSpy).toHaveBeenCalledWith({ name: 'ai_narrative_enabled', value: '1' });
      expect(messageServiceAddSpy).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error',
        detail: 'Error updating AI narrative flag'
      });
    });
  });
});

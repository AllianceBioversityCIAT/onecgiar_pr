import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RolesService } from '../../services/global/roles.service';
import { AiAssistantService } from './ai-assistant.service';
import { DeviceCapabilityService } from './device-capability.service';
import { UserContextService } from './user-context.service';
import { ASSISTANT_ENGINE, AssistantEngine, AssistantEngineError, EngineProgress } from './engine/assistant-engine.types';

class FakeEngine implements AssistantEngine {
  nextResponses: string[] = [];
  initError: AssistantEngineError | null = null;
  initCalls = 0;

  async init(_tier: unknown, onProgress: (p: EngineProgress) => void): Promise<void> {
    this.initCalls++;
    onProgress({ progress: 1, text: 'done', fromCache: true });
    if (this.initError) {
      const err = this.initError;
      this.initError = null; // fail once, then succeed on retry
      throw err;
    }
  }
  async complete(): Promise<string> {
    return this.nextResponses.shift() ?? '{"reply":"ok","tool":"none","args":{}}';
  }
  async isModelCached(): Promise<boolean> {
    return true;
  }
  interrupt(): void {}
  dispose(): void {}
}

describe('AiAssistantService', () => {
  let service: AiAssistantService;
  let engine: FakeEngine;
  let navigate: jest.Mock;
  let navigateByUrl: jest.Mock;
  let findResults: jest.Mock;
  let myResults: jest.Mock;

  const identity = { name: 'Ada Lovelace', firstName: 'Ada', email: 'ada@cgiar.org', isAdmin: false, readOnly: false };

  beforeEach(() => {
    engine = new FakeEngine();
    navigate = jest.fn().mockResolvedValue(true);
    navigateByUrl = jest.fn().mockResolvedValue(true);
    findResults = jest.fn().mockResolvedValue([]);
    myResults = jest.fn().mockResolvedValue([]);
    TestBed.configureTestingModule({
      providers: [
        AiAssistantService,
        { provide: ASSISTANT_ENGINE, useValue: engine },
        { provide: DeviceCapabilityService, useValue: { detect: async () => ({ tier: 'small', reason: 'ok' }) } },
        { provide: Router, useValue: { navigate, navigateByUrl } },
        { provide: RolesService, useValue: { isAdmin: false } },
        { provide: UserContextService, useValue: { identity: () => identity, myResults, findResults } }
      ]
    });
    service = TestBed.inject(AiAssistantService);
  });

  async function makeReady() {
    await service.detect();
    expect(service.status()).toBe('ready');
  }

  it('reaches ready when the model is cached, with a welcome message', async () => {
    await makeReady();
    expect(service.messages().length).toBeGreaterThan(0);
  });

  it('dispatches a valid navigate tool call', async () => {
    await makeReady();
    engine.nextResponses = ['{"reply":"Sure","tool":"navigate","args":{"section":"results-center"}}'];
    await service.send('take me to results center');
    expect(navigate).toHaveBeenCalledWith(['/result/results-outlet/results-list']);
    const last = service.messages().at(-1)!;
    expect(last.action).toContain('Results Center');
  });

  it('does not navigate on a "none" tool', async () => {
    await makeReady();
    engine.nextResponses = ['{"reply":"I can help you navigate.","tool":"none","args":{}}'];
    await service.send('hello');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('contains malformed JSON with a fallback reply', async () => {
    await makeReady();
    engine.nextResponses = ['not json at all'];
    await service.send('go somewhere');
    expect(navigate).not.toHaveBeenCalled();
    expect(service.status()).toBe('ready');
    expect(service.messages().at(-1)!.text).toContain('navigate');
  });

  it('contains an unknown tool name', async () => {
    await makeReady();
    engine.nextResponses = ['{"reply":"x","tool":"launch_rockets","args":{}}'];
    await service.send('do something');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('rejects admin-module navigation for a non-admin and does not navigate', async () => {
    await makeReady();
    engine.nextResponses = ['{"reply":"Opening admin","tool":"navigate","args":{"section":"admin-module"}}'];
    await service.send('open admin module');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('greets the user by first name', async () => {
    await makeReady();
    expect(service.messages()[0].text).toContain('Ada');
  });

  it('open_result navigates directly when there is a single match', async () => {
    await makeReady();
    findResults.mockResolvedValueOnce([{ code: '5844', title: 'Maize study', versionId: 10 }]);
    engine.nextResponses = ['{"reply":"","tool":"open_result","args":{"query":"5844"}}'];
    await service.send('abre el resultado 5844');
    expect(navigateByUrl).toHaveBeenCalledWith('/result/result-detail/5844/general-information?phase=10');
  });

  it('open_result renders clickable cards when several match', async () => {
    await makeReady();
    findResults.mockResolvedValueOnce([
      { code: '1', title: 'Maize A', versionId: 10 },
      { code: '2', title: 'Maize B', versionId: 10 }
    ]);
    engine.nextResponses = ['{"reply":"","tool":"open_result","args":{"query":"maize"}}'];
    await service.send('abre mi resultado de maíz');
    expect(navigateByUrl).not.toHaveBeenCalled();
    expect(service.messages().at(-1)!.cards?.length).toBe(2);
  });

  it('list_my_results renders the results as cards without feeding them to the model', async () => {
    await makeReady();
    myResults.mockResolvedValueOnce([{ code: '7', title: 'My result', versionId: 12, statusName: 'Editing' }]);
    engine.nextResponses = ['{"reply":"","tool":"list_my_results","args":{}}'];
    await service.send('muéstrame mis resultados');
    const last = service.messages().at(-1)!;
    expect(last.cards?.[0].url).toBe('/result/result-detail/7/general-information?phase=12');
  });

  it('demotes the tier and retries once on an OOM error', async () => {
    engine.initError = new AssistantEngineError('oom', 'out of memory');
    await service.detect();
    expect(engine.initCalls).toBe(2);
    expect(service.status()).toBe('ready');
    expect(service.tier()).toBe('no-f16'); // small demoted to no-f16
  });
});

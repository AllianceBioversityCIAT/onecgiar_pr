import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultAiItemComponent } from './result-ai-item.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CreateResultManagementService } from '../../../../services/create-result-management.service';
import { CustomizedAlertsFeService } from '../../../../../../../../shared/services/customized-alerts-fe.service';
import { AIAssistantResult } from '../../../../../../../../shared/interfaces/AIAssistantResult';
jest.useFakeTimers();

describe('ResultAiItemComponent', () => {
  let component: ResultAiItemComponent;
  let fixture: ComponentFixture<ResultAiItemComponent>;
  let createResultManagementService: CreateResultManagementService;
  let alertsServiceMock: { show: jest.Mock };

  const makeItem = (overrides: Partial<AIAssistantResult> = {}): AIAssistantResult => ({
    indicator: 'Innovation Development',
    title: 'Initial Title',
    description: 'Some description',
    keywords: ['k1', 'k2'],
    geoscope: [],
    training_type: 'Workshop',
    length_of_training: 'short-term',
    start_date: '2024-01-01',
    end_date: '2024-01-02',
    degree: '',
    delivery_modality: 'in-person',
    total_participants: 10,
    non_binary_participants: '0',
    female_participants: 5,
    male_participants: 5,
    evidence_for_stage: 'evidence',
    policy_type: 'type',
    stage_in_policy_process: 'stage',
    alliance_main_contact_person_first_name: 'Jane',
    alliance_main_contact_person_last_name: 'Doe',
    result_official_code: 'R-123',
    ...overrides
  });

  beforeEach(async () => {
    alertsServiceMock = { show: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [ResultAiItemComponent, HttpClientTestingModule],
      providers: [CreateResultManagementService, { provide: CustomizedAlertsFeService, useValue: alertsServiceMock }]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultAiItemComponent);
    component = fixture.componentInstance;
    createResultManagementService = TestBed.inject(CreateResultManagementService);

    component.item = makeItem();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle expand state for the given item', () => {
    const item = component.item;
    expect(createResultManagementService.expandedItem()).toBeNull();

    component.toggleExpand(item);
    expect(createResultManagementService.expandedItem()).toBe(item);

    component.toggleExpand(item);
    expect(createResultManagementService.expandedItem()).toBeNull();
  });

  it('should discard result by removing it from service items', () => {
    const item = component.item;
    createResultManagementService.items.set([item]);
    expect(createResultManagementService.items().length).toBe(1);

    component.discardResult(item);

    expect(createResultManagementService.items().length).toBe(0);
  });

  it('should finish editing title before creating result and show success alert', () => {
    const item = component.item;

    component.startEditingTitle();
    component.tempTitle = 'New Title';

    component.createResult(item);

    // should set creating state immediately
    expect(component.isCreating()).toBe(true);

    jest.runAllTimers();

    // alert called
    expect(alertsServiceMock.show).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'create-result', status: 'success', title: expect.stringContaining('New Title') })
    );

    // states updated
    expect(component.isCreated()).toBe(true);
    expect(component.isCreating()).toBe(false);

    // title saved and editing ended
    expect(item.title).toBe('New Title');
    expect(component.isEditingTitle()).toBe(false);
  });

  it('should open result in new tab with the correct URL', () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    const item = component.item;

    component.openResult(item);

    expect(openSpy).toHaveBeenCalledWith(`/result/${item.result_official_code}/general-information`, '_blank');
    openSpy.mockRestore();
  });

  it('should detect AIAssistantResult by presence of training_type', () => {
    expect(component.isAIAssistantResult(component.item)).toBe(true);

    const withoutTrainingType = makeItem({ training_type: undefined });
    expect(component.isAIAssistantResult(withoutTrainingType)).toBe(true);
  });

  it('should manage title editing states', () => {
    component.startEditingTitle();
    expect(component.isEditingTitle()).toBe(true);

    component.tempTitle = 'Edited Title';
    component.finishEditingTitle();
    expect(component.item.title).toBe('Edited Title');
    expect(component.isEditingTitle()).toBe(false);

    component.startEditingTitle();
    component.cancelEditingTitle();
    expect(component.isEditingTitle()).toBe(false);
  });

  it('getOrganizationType/getOrganizations/getInnovationActorsDetailed should return arrays or empty arrays', () => {
    const base = makeItem({ organization_type: undefined, organizations: undefined, innovation_actors_detailed: undefined });

    expect(component.getOrganizationType(base)).toEqual([]);
    expect(component.getOrganizations(base)).toEqual([]);
    expect(component.getInnovationActorsDetailed(base)).toEqual([]);

    const withValues = makeItem({
      organization_type: ['Gov'],
      organizations: ['Org1'],
      innovation_actors_detailed: [{ name: 'A', type: 'T', gender_age: ['F'] }]
    });

    expect(component.getOrganizationType(withValues)).toEqual(['Gov']);
    expect(component.getOrganizations(withValues)).toEqual(['Org1']);
    expect(component.getInnovationActorsDetailed(withValues)).toEqual([{ name: 'A', type: 'T', gender_age: ['F'] }]);
  });
});

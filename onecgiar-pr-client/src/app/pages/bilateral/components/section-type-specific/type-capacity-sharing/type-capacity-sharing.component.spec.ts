import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

import { TypeCapacitySharingComponent } from './type-capacity-sharing.component';
import { BilateralApiService } from '../../../../../shared/services/api/bilateral-api.service';
import { BilateralCreationService } from '../../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../../services/bilateral-auto-save.service';

describe('TypeCapacitySharingComponent', () => {
  let fixture: ComponentFixture<TypeCapacitySharingComponent>;
  let component: TypeCapacitySharingComponent;
  let bilateralApi: any;
  let creation: any;
  let mdsTracker: any;
  let autoSave: any;

  const build = () => {
    fixture = TestBed.createComponent(TypeCapacitySharingComponent);
    component = fixture.componentInstance;
    return component;
  };

  beforeEach(async () => {
    mdsTracker = { setSectionFields: jest.fn() };
    autoSave = {
      fieldStatus: signal<Record<string, string>>({}),
      schedulePayload: jest.fn()
    };
    creation = { currentResultId: signal<number | null>(123) };
    bilateralApi = {
      GET_capacityDevelopment: jest.fn().mockReturnValue(of({ response: {} })),
      GET_capdevsDeliveryMethod: jest.fn().mockReturnValue(of({ response: [{ code: 1 }] })),
      PATCH_capacityDevelopment: jest.fn().mockReturnValue(of({}))
    };

    await TestBed.configureTestingModule({
      imports: [TypeCapacitySharingComponent],
      providers: [
        { provide: BilateralApiService, useValue: bilateralApi },
        { provide: BilateralCreationService, useValue: creation },
        { provide: BilateralMdsTrackerService, useValue: mdsTracker },
        { provide: BilateralAutoSaveService, useValue: autoSave }
      ]
    })
      .overrideTemplate(TypeCapacitySharingComponent, '<div></div>')
      .compileComponents();
  });

  it('should create', () => {
    expect(build()).toBeTruthy();
  });

  it('loads the data and updates the MDS tracker', () => {
    bilateralApi.GET_capacityDevelopment.mockReturnValue(
      of({ response: { female_using: 1, male_using: 2, non_binary_using: 0, capdev_delivery_method_id: 4 } })
    );
    build();
    fixture.detectChanges();
    expect(component.body.female_using).toBe(1);
    expect(component.deliveryMethods).toEqual([{ code: 1 }]);
    expect(mdsTracker.setSectionFields).toHaveBeenCalledWith('type-specific', [
      { key: 'female-using', label: 'Female participants', filled: true },
      { key: 'male-using', label: 'Male participants', filled: true },
      { key: 'non-binary-using', label: 'Non-binary participants', filled: true },
      { key: 'delivery-method', label: 'Delivery method', filled: true },
    ]);
  });

  it('falls back to empty defaults when the responses are empty', () => {
    bilateralApi.GET_capacityDevelopment.mockReturnValue(of({ response: null }));
    bilateralApi.GET_capdevsDeliveryMethod.mockReturnValue(of({ response: null }));
    build();
    fixture.detectChanges();
    expect(component.body).toEqual({});
    expect(component.deliveryMethods).toEqual([]);
    expect(mdsTracker.setSectionFields).toHaveBeenCalledWith('type-specific', [
      { key: 'female-using', label: 'Female participants', filled: false },
      { key: 'male-using', label: 'Male participants', filled: false },
      { key: 'non-binary-using', label: 'Non-binary participants', filled: false },
      { key: 'delivery-method', label: 'Delivery method', filled: false },
    ]);
  });

  it('counts a zero delivery method id as empty but zero people as filled', () => {
    build();
    component.body = { female_using: 0, male_using: null, non_binary_using: undefined, capdev_delivery_method_id: 0 };
    component.updateMds();
    expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith('type-specific', [
      { key: 'female-using', label: 'Female participants', filled: true },
      { key: 'male-using', label: 'Male participants', filled: false },
      { key: 'non-binary-using', label: 'Non-binary participants', filled: false },
      { key: 'delivery-method', label: 'Delivery method', filled: false },
    ]);
  });

  it('queues a save via autoSave.schedulePayload on onSave', () => {
    build();
    component.body = { female_using: 5 };
    component.onSave();
    expect(autoSave.schedulePayload).toHaveBeenCalledWith(
      'typeSpecific',
      { female_using: 5 },
      expect.objectContaining({ debounceMs: 0 })
    );
  });

  it('tracks the saving state from fieldStatus', () => {
    build();
    expect(component.saving()).toBe(false);
    autoSave.fieldStatus.set({ 'type-specific': 'saving' });
    expect(component.saving()).toBe(true);
    autoSave.fieldStatus.set({ 'type-specific': 'saved' });
    expect(component.saving()).toBe(false);
  });
});

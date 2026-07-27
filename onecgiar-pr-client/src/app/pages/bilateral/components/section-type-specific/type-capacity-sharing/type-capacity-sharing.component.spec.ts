import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { TypeCapacitySharingComponent } from './type-capacity-sharing.component';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { BilateralMdsTrackerService } from '../../../services/bilateral-mds-tracker.service';

describe('TypeCapacitySharingComponent', () => {
  let fixture: ComponentFixture<TypeCapacitySharingComponent>;
  let component: TypeCapacitySharingComponent;
  let api: any;
  let mdsTracker: any;

  const build = () => {
    fixture = TestBed.createComponent(TypeCapacitySharingComponent);
    component = fixture.componentInstance;
    return component;
  };

  beforeEach(async () => {
    mdsTracker = { updateSection: jest.fn(), setTotalFields: jest.fn() };
    api = {
      resultsSE: {
        GET_capacityDevelopent: jest.fn().mockReturnValue(of({ response: {} })),
        GET_capdevsDeliveryMethod: jest.fn().mockReturnValue(of({ response: [{ code: 1 }] })),
        PATCH_capacityDevelopent: jest.fn().mockReturnValue(of({}))
      }
    };

    await TestBed.configureTestingModule({
      imports: [TypeCapacitySharingComponent],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: BilateralMdsTrackerService, useValue: mdsTracker }
      ]
    })
      .overrideTemplate(TypeCapacitySharingComponent, '<div></div>')
      .compileComponents();
  });

  it('should create', () => {
    expect(build()).toBeTruthy();
  });

  it('registers the total number of fields and loads the data', () => {
    api.resultsSE.GET_capacityDevelopent.mockReturnValue(
      of({ response: { female_using: 1, male_using: 2, non_binary_using: 0, capdev_delivery_method_id: 4 } })
    );
    build();
    fixture.detectChanges();
    expect(mdsTracker.setTotalFields).toHaveBeenCalledWith('type-specific', 4);
    expect(component.body.female_using).toBe(1);
    expect(component.deliveryMethods).toEqual([{ code: 1 }]);
    expect(mdsTracker.updateSection).toHaveBeenCalledWith('type-specific', 4);
  });

  it('falls back to empty defaults when the responses are empty', () => {
    api.resultsSE.GET_capacityDevelopent.mockReturnValue(of({ response: null }));
    api.resultsSE.GET_capdevsDeliveryMethod.mockReturnValue(of({ response: null }));
    build();
    fixture.detectChanges();
    expect(component.body).toEqual({});
    expect(component.deliveryMethods).toEqual([]);
    expect(mdsTracker.updateSection).toHaveBeenCalledWith('type-specific', 0);
  });

  it('counts a zero delivery method id as empty but zero people as filled', () => {
    build();
    component.body = { female_using: 0, male_using: null, non_binary_using: undefined, capdev_delivery_method_id: 0 };
    component.updateMds();
    expect(mdsTracker.updateSection).toHaveBeenLastCalledWith('type-specific', 1);
  });

  it('saves and reloads on success', () => {
    build();
    component.onSave();
    expect(api.resultsSE.PATCH_capacityDevelopent).toHaveBeenCalledWith(component.body);
    expect(api.resultsSE.GET_capacityDevelopent).toHaveBeenCalled();
    expect(component.saving()).toBe(false);
  });

  it('clears the saving flag when the request fails', () => {
    api.resultsSE.PATCH_capacityDevelopent.mockReturnValue(throwError(() => new Error('boom')));
    build();
    component.onSave();
    expect(component.saving()).toBe(false);
  });
});

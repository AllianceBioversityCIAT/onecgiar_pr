import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

import { TypeKnowledgeProductComponent } from './type-knowledge-product.component';
import { BilateralApiService } from '../../../../../shared/services/api/bilateral-api.service';
import { BilateralCreationService } from '../../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../../services/bilateral-mds-tracker.service';

describe('TypeKnowledgeProductComponent', () => {
  let fixture: ComponentFixture<TypeKnowledgeProductComponent>;
  let component: TypeKnowledgeProductComponent;
  let bilateralApi: any;
  let creation: any;
  let mdsTracker: any;

  const build = () => {
    fixture = TestBed.createComponent(TypeKnowledgeProductComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return component;
  };

  const lastTrackedFields = () => mdsTracker.setSectionFields.mock.calls.at(-1)[1];

  beforeEach(async () => {
    mdsTracker = { setSectionFields: jest.fn() };
    creation = { currentResultId: signal<number | null>(123) };
    bilateralApi = {
      GET_knowledgeProduct: jest.fn().mockReturnValue(of({ response: { handle: '10568/185045', title: 'A KP' } })),
    };

    await TestBed.configureTestingModule({
      imports: [TypeKnowledgeProductComponent],
      providers: [
        { provide: BilateralApiService, useValue: bilateralApi },
        { provide: BilateralCreationService, useValue: creation },
        { provide: BilateralMdsTrackerService, useValue: mdsTracker },
      ],
    })
      .overrideTemplate(TypeKnowledgeProductComponent, '<div></div>')
      .compileComponents();
  });

  it('should create', () => {
    expect(build()).toBeTruthy();
  });

  it('exposes the synced metadata and counts the handle once loaded', () => {
    build();

    expect(bilateralApi.GET_knowledgeProduct).toHaveBeenCalledWith(123);
    expect(component.body.handle).toBe('10568/185045');
    expect(component.loading()).toBe(false);
    expect(component.loadFailed()).toBe(false);
    expect(lastTrackedFields()).toEqual([{ key: 'handle', label: 'Knowledge product handle', filled: true }]);
  });

  /**
   * P2-3355: QA saw "0/0 fields" and no content. 0/0 is the tell — a successful load registers one
   * field, so it can only ever read 0/1 or 1/1. The section was registering nothing at all because
   * the tracker call lived only in the success callback.
   */
  describe('when the metadata cannot be loaded', () => {
    it('still publishes an unfilled checklist item instead of leaving the section at 0/0', () => {
      bilateralApi.GET_knowledgeProduct.mockReturnValue(throwError(() => new Error('404')));
      build();

      expect(lastTrackedFields()).toEqual([{ key: 'handle', label: 'Knowledge product handle', filled: false }]);
    });

    it('surfaces the failure instead of rendering an empty section', () => {
      bilateralApi.GET_knowledgeProduct.mockReturnValue(throwError(() => new Error('404')));
      build();

      expect(component.loading()).toBe(false);
      expect(component.loadFailed()).toBe(true);
      expect(component.body).toEqual({});
    });

    it('does the same when there is no current result id to ask about', () => {
      creation.currentResultId.set(null);
      build();

      expect(bilateralApi.GET_knowledgeProduct).not.toHaveBeenCalled();
      expect(component.loadFailed()).toBe(true);
      expect(lastTrackedFields()).toEqual([{ key: 'handle', label: 'Knowledge product handle', filled: false }]);
    });
  });

  it('counts the handle as missing when the record comes back without one', () => {
    bilateralApi.GET_knowledgeProduct.mockReturnValue(of({ response: { title: 'A KP with no handle' } }));
    build();

    expect(component.loadFailed()).toBe(false);
    expect(lastTrackedFields()).toEqual([{ key: 'handle', label: 'Knowledge product handle', filled: false }]);
  });
});

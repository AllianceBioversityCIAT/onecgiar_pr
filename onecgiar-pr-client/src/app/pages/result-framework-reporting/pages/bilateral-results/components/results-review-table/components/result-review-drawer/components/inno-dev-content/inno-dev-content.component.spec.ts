import { ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { InnoDevContentComponent } from './inno-dev-content.component';
import { InnovationControlListService } from '../../../../../../../../../../shared/services/global/innovation-control-list.service';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('InnoDevContentComponent', () => {
  let component: InnoDevContentComponent;
  let fixture: ComponentFixture<InnoDevContentComponent>;
  let readinessLevelsLoaded$: Subject<void>;

  beforeEach(async () => {
    readinessLevelsLoaded$ = new Subject<void>();

    await TestBed.configureTestingModule({
      imports: [InnoDevContentComponent],
      providers: [
        {
          provide: InnovationControlListService,
          useValue: { typeList: [], characteristicsList: [], readinessLevelsList: [], useLevelsList: [], readinessLevelsLoaded$ }
        }
      ]
    })
      .overrideComponent(InnoDevContentComponent, {
        set: { template: '', imports: [], styles: [], changeDetection: ChangeDetectionStrategy.Default }
      })
      .compileComponents();

    fixture = TestBed.createComponent(InnoDevContentComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('resultDetail setter', () => {
    it('accepts a falsy value untouched', () => {
      component.resultDetail = null as any;
      expect(component.resultDetail).toBeNull();
    });

    it('injects a default body when resultTypeResponse is missing', () => {
      const detail: any = {};
      component.resultDetail = detail;
      expect(detail.resultTypeResponse[0]).toEqual({
        result_innovation_dev_id: null,
        innovation_nature_id: null,
        innovation_type_id: null,
        innovation_type_name: null,
        innovation_developers: null,
        innovation_readiness_level_id: null,
        readinness_level_id: null,
        level: null,
        name: null
      });
    });

    it('injects a default body for an empty array and a non-array value', () => {
      const empty: any = { resultTypeResponse: [] };
      component.resultDetail = empty;
      expect(empty.resultTypeResponse.length).toBe(1);

      const notArray: any = { resultTypeResponse: { a: 1 } };
      component.resultDetail = notArray;
      expect(Array.isArray(notArray.resultTypeResponse)).toBe(true);
    });

    it('backfills only the undefined keys of an existing body', () => {
      const detail: any = { resultTypeResponse: [{ result_innovation_dev_id: 12 }] };
      component.resultDetail = detail;
      const first = detail.resultTypeResponse[0];
      expect(first.result_innovation_dev_id).toBe(12);
      expect(first.innovation_nature_id).toBeNull();
      expect(first.level).toBeNull();
      expect(first.innovation_type_id).toBeNull();
      expect(first.innovation_type_name).toBeNull();
      expect(first.innovation_developers).toBeNull();
      expect(first.innovation_readiness_level_id).toBeNull();
      expect(first.readinness_level_id).toBeNull();
      expect(first.name).toBeNull();
    });

    it('keeps a fully populated body untouched', () => {
      const detail: any = {
        resultTypeResponse: [
          {
            innovation_nature_id: 1,
            innovation_type_id: 2,
            innovation_type_name: 'T',
            innovation_developers: 'D',
            innovation_readiness_level_id: 3,
            readinness_level_id: 3,
            level: 'L',
            name: 'N'
          }
        ]
      };
      component.resultDetail = detail;
      expect(detail.resultTypeResponse[0].name).toBe('N');
    });
  });

  describe('lifecycle', () => {
    it('marks for check when the readiness levels load', () => {
      component.ngOnInit();
      expect(() => readinessLevelsLoaded$.next()).not.toThrow();
    });

    it('stops listening after destroy', () => {
      component.ngOnInit();
      component.ngOnDestroy();
      expect(readinessLevelsLoaded$.observed).toBe(false);
    });
  });

  it('readinessDescription returns the copy', () => {
    expect(component.readinessDescription()).toContain('readiness level');
  });
});

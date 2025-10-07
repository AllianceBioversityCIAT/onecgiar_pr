import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { EntityDetailsComponent } from './entity-details.component';
import { ApiService } from '../../../../shared/services/api/api.service';
import { EntityAowService } from '../entity-aow/services/entity-aow.service';

describe('EntityDetailsComponent', () => {
  let component: EntityDetailsComponent;
  let fixture: ComponentFixture<EntityDetailsComponent>;
  let params$: BehaviorSubject<any>;
  let apiServiceMock: any;
  let entityAowServiceMock: any;

  beforeEach(async () => {
    params$ = new BehaviorSubject({ entityId: '123' });

    apiServiceMock = {
      resultsSE: {
        GET_ClarisaGlobalUnits: jest.fn().mockReturnValue(of({ response: [] }))
      }
    };

    entityAowServiceMock = {
      entityId: signal<string>(''),
      aowId: signal<string>(''),
      entityDetails: signal<any>({}),
      entityAows: signal<any[]>([]),
      isLoadingDetails: signal<boolean>(false),
      sideBarItems: signal<any[]>([]),
      getClarisaGlobalUnits: jest.fn(),
      setSideBarItems: jest.fn(),
      getAllDetailsData: jest.fn(),
      getIndicatorSummaries: jest.fn(),
      indicatorSummaries: signal<any[]>([])
    };

    await TestBed.configureTestingModule({
      imports: [EntityDetailsComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { params: params$.asObservable() } },
        { provide: ApiService, useValue: apiServiceMock },
        { provide: EntityAowService, useValue: entityAowServiceMock }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(EntityDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set entityId from route params on init', () => {
    expect(entityAowServiceMock.entityId()).toBe('123');
  });

  it('should update entityId when route params change', () => {
    params$.next({ entityId: '456' });
    fixture.detectChanges();
    expect(entityAowServiceMock.entityId()).toBe('456');
  });
});

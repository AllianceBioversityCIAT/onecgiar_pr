import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { EntityDetailsComponent } from './entity-details.component';
import { ApiService } from '../../../../shared/services/api/api.service';

describe('EntityDetailsComponent', () => {
  let component: EntityDetailsComponent;
  let fixture: ComponentFixture<EntityDetailsComponent>;
  let params$: BehaviorSubject<any>;
  let apiServiceMock: any;

  beforeEach(async () => {
    params$ = new BehaviorSubject({ id: '123' });

    apiServiceMock = {
      resultsSE: {
        GET_ClarisaGlobalUnits: jest.fn().mockReturnValue(of({ response: [] }))
      }
    };

    await TestBed.configureTestingModule({
      imports: [EntityDetailsComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { params: params$.asObservable() } },
        { provide: ApiService, useValue: apiServiceMock }
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
    expect(component.entityId()).toBe('123');
  });

  it('should update entityId when route params change', () => {
    params$.next({ id: '456' });
    fixture.detectChanges();
    expect(component.entityId()).toBe('456');
  });
});

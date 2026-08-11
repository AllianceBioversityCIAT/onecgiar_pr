import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { ResultMetadataListComponent } from './result-metadata-list.component';
import { ApiService } from '../../services/api/api.service';
import { DataControlService } from '../../services/data-control.service';

describe('ResultMetadataListComponent', () => {
  let fixture: ComponentFixture<ResultMetadataListComponent>;
  let component: ResultMetadataListComponent;
  let apiMock: any;
  let dataControlMock: any;

  beforeEach(async () => {
    apiMock = { resultsSE: { currentResultCode: 'AB-1234' } };
    dataControlMock = {
      currentResult: {
        status_name: 'Editing',
        result_level_name: 'Output',
        result_type_name: 'Innovation use',
        initiative_official_code: 'SP01',
        initiative_name: 'Multifunctional Landscapes',
        source_name: 'Pooled'
      },
      currentResultSignal: signal({})
    };

    await TestBed.configureTestingModule({
      imports: [ResultMetadataListComponent],
      providers: [
        { provide: ApiService, useValue: apiMock },
        { provide: DataControlService, useValue: dataControlMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultMetadataListComponent);
    component = fixture.componentInstance;
  });

  it('exposes the same six fields the sidebar footer used to carry, in order', () => {
    expect(component.rows.map(r => r.label)).toEqual(['Code', 'Status', 'Level', 'Category', 'Submitter', 'Funding']);
    expect(component.rows.map(r => r.value)).toEqual([
      'AB-1234',
      'Editing',
      'Output',
      'Innovation use',
      'SP01 · Multifunctional Landscapes',
      'Pooled'
    ]);
  });

  it('renders one row per field', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('dt').length).toBe(6);
    expect(fixture.nativeElement.textContent).toContain('Innovation use');
  });

  it('drops the separator when the submitter has no initiative name', () => {
    dataControlMock.currentResult.initiative_name = null;
    expect(component.rows.find(r => r.label === 'Submitter')?.value).toBe('SP01');
  });

  it('renders empty values rather than "undefined" before the result loads', () => {
    dataControlMock.currentResult = null;
    apiMock.resultsSE.currentResultCode = null;
    fixture.detectChanges();

    expect(component.rows.every(r => r.value === '')).toBe(true);
    expect(fixture.nativeElement.textContent).not.toContain('undefined');
  });

  it('switches between the inline and the narrow-card layout', () => {
    expect(component.listClass).toContain('flex-wrap');
    expect(component.rowClass).not.toContain('justify-between');

    component.orientation = 'stacked';
    expect(component.listClass).toContain('flex-col');
    expect(component.rowClass).toContain('justify-between');
  });
});

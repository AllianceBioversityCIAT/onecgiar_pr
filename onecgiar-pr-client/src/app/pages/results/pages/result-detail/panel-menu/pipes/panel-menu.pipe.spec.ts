import { TestBed } from '@angular/core/testing';
import { PanelMenuPipe } from './panel-menu.pipe';
import { DataControlService } from '../../../../../../shared/services/data-control.service';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';

describe('PanelMenuPipe', () => {
  let pipe: PanelMenuPipe;
  let mockDataControlService: any;
  let mockFieldsManagerService: any;

  beforeEach(() => {
    mockDataControlService = {
      green_checks: [
        { section_name: 'Section1', validation: '1' },
        { section_name: 'Section2', validation: '0' },
        { section_name: 'Section3', validation: '0' },
      ],
    };

    mockFieldsManagerService = {
      isP25: jest.fn().mockReturnValue(false),
      isP22: jest.fn().mockReturnValue(false)
    };

    TestBed.configureTestingModule({
      providers: [
        PanelMenuPipe,
        { provide: DataControlService, useValue: mockDataControlService },
        { provide: FieldsManagerService, useValue: mockFieldsManagerService }
      ]
    });

    pipe = TestBed.inject(PanelMenuPipe);
  });

  it('should apply transformations to the list based on green_checks', () => {
    const list = [
      { path: 'Section1', prHide: true},
      { path: 'Section2'},
      { path: 'Section3', prHide: false},
      { path: '**', prHide: false },
    ];

    const transformedList = pipe.transform(list, '1', true);

    expect(transformedList[0].validation).toEqual(1);
    expect(transformedList.find(item => item.path === 'Section1')).toBeTruthy();
    expect(transformedList.find(item => item.path === 'Section2')).toBeTruthy();
    expect(transformedList.find(item => item.path === 'Section3')).toBeFalsy();
    expect(transformedList.find(item => item.path === '**')).toBeFalsy();

  });
});

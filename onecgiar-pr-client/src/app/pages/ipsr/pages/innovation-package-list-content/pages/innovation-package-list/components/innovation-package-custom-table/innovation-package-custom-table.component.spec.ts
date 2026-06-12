import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TableModule } from 'primeng/table';
import { MenuModule } from 'primeng/menu';
import { InnovationPackageCustomTableComponent } from './innovation-package-custom-table.component';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { of, throwError } from 'rxjs';

describe('InnovationPackageCustomTableComponent', () => {
  let component: InnovationPackageCustomTableComponent;
  let fixture: ComponentFixture<InnovationPackageCustomTableComponent>;
  let mockApiService: any;

  beforeEach(async () => {
    mockApiService = {
      updateResultsList: jest.fn(),
      shouldShowUpdate: jest.fn().mockReturnValue(false),
      resultsSE: {
        GET_reportingList: () => of({ response: [] }),
        PATCH_DeleteResult: () => of({}),
        GET_TypeByResultLevel: () => of({}),
        GET_versioning: () => of({ response: [{ phase_year: 2023 }] }),
        GET_allRequest: () => of({}),
        GET_requestStatus: () => of({}),
        DELETEInnovationPackage: () => of({}),
        currentResultId: 1
      },
      dataControlSE: {
        currentResult: {
          phase_year: 2023,
          role_id: 3,
          status_id: '1',
          acronym: 'P25'
        },
        myInitiativesList: [
          { id: 1, selected: false },
          { id: 2, selected: false }
        ],
        showShareRequest: false,
        chagePhaseModal: false,
        IPSRCurrentPhase: {
          portfolioAcronym: 'P25',
          phaseYear: 2024
        }
      },
      alertsFe: {
        show: jest.fn().mockImplementation((config, callback) => {
          if (callback) callback();
        })
      },
      rolesSE: {
        isAdmin: false
      }
    };

    await TestBed.configureTestingModule({
      declarations: [InnovationPackageCustomTableComponent],
      imports: [HttpClientTestingModule, TableModule, MenuModule],
      providers: [{ provide: ApiService, useValue: mockApiService }]
    }).compileComponents();

    fixture = TestBed.createComponent(InnovationPackageCustomTableComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set showShareRequest to true when "Map to TOC" is selected from items', () => {
    component.items[0].command();

    expect(component.api.dataControlSE.showShareRequest).toBe(true);
  });

  it('should set chagePhaseModal to true when "Update result" is selected from items', () => {
    component.items[1].command();

    expect(component.api.dataControlSE.chagePhaseModal).toBe(true);
  });

  it('should set showShareRequest to true when "Map to TOC" is selected from itemsWithDelete', () => {
    component.itemsWithDelete[0].command();

    expect(component.api.dataControlSE.showShareRequest).toBe(true);
  });

  it('should set chagePhaseModal to true when "Update result" is selected from itemsWithDelete', () => {
    component.itemsWithDelete[1].command();

    expect(component.api.dataControlSE.chagePhaseModal).toBe(true);
  });

  it('should call onDelete when "Delete" is selected', () => {
    const onDeleteSpy = jest.spyOn(component, 'onDelete');

    component.itemsWithDelete[2].command();

    expect(onDeleteSpy).toHaveBeenCalled();
  });

  it('should show confirmation alert and delete result on confirmed action', () => {
    const spy = jest.spyOn(mockApiService.resultsSE, 'DELETEInnovationPackage');
    const spyShow = jest.spyOn(mockApiService.alertsFe, 'show');
    const deleteEventSpy = jest.spyOn(component.deleteEvent, 'emit');

    component.onDelete();

    expect(spy).toHaveBeenCalledWith(component.currentInnovationPackageToAction.id);
    expect(spyShow).toHaveBeenCalled();
    expect(deleteEventSpy).toHaveBeenCalled();
  });

  it('should handle errors from DELETEInnovationPackage correctly', () => {
    const errorMessage = 'Error when delete Innovation Package';
    mockApiService.alertsFe.show.mockImplementation((config, callback) => {
      if (callback) callback();
    });
    const spy = jest.spyOn(mockApiService.resultsSE, 'DELETEInnovationPackage').mockReturnValue(throwError(new Error(errorMessage)));

    component.onDelete();

    expect(spy).toHaveBeenCalled();
    expect(mockApiService.alertsFe.show).toHaveBeenCalledTimes(2);
  });

  describe('onPressAction', () => {
    it('should set currentInnovationPackageToAction properties when onPressAction is called', () => {
      const result = {
        id: '1',
        title: 'Test Innovation Package',
        official_code: '12345',
        initiative_entity_map: [{ entityId: 1 }],
        initiative_entity_user: [{ initiative_id: 1 }],
        phase_year: 2023,
        role_id: 3,
        status_id: '1',
        acronym: 'P25'
      };

      component.onPressAction(result);

      expect(component.currentInnovationPackageToAction.id).toBe('1');
      expect(component.currentInnovationPackageToAction.title).toBe('Test Innovation Package');
      expect(component.retrieveModalSE.title).toBe('Test Innovation Package');
      expect(component.retrieveModalSE.requester_initiative_id).toBe('12345');
      expect(component.api.resultsSE.currentResultId).toBe('1');
      expect(component.api.dataControlSE.currentResult).toBe(result);
    });

    it('should set items[1].visible based on shouldShowUpdate', () => {
      mockApiService.shouldShowUpdate.mockReturnValue(true);
      const result = {
        id: '1',
        title: 'Test',
        official_code: 'ABC123',
        phase_year: 2023,
        role_id: 3,
        status_id: '1',
        acronym: 'P25'
      };

      component.onPressAction(result);

      expect(component.items[1].visible).toBe(true);
    });

    it('should use canUpdate for itemsWithDelete[1].visible when portfolioAcronym is P25', () => {
      mockApiService.dataControlSE.IPSRCurrentPhase.portfolioAcronym = 'P25';
      mockApiService.shouldShowUpdate.mockReturnValue(true);
      const result = {
        id: '1',
        title: 'Test',
        official_code: 'ABC123',
        phase_year: 2023,
        role_id: 3,
        status_id: '1',
        acronym: 'P25'
      };

      component.onPressAction(result);

      expect(component.itemsWithDelete[1].visible).toBe(true);
    });

    it('should use phase_year comparison for itemsWithDelete[1].visible when portfolioAcronym is not P25', () => {
      mockApiService.dataControlSE.IPSRCurrentPhase.portfolioAcronym = 'P22';
      mockApiService.dataControlSE.IPSRCurrentPhase.phaseYear = 2024;
      mockApiService.shouldShowUpdate.mockReturnValue(false);
      const result = {
        id: '1',
        title: 'Test',
        official_code: 'ABC123',
        phase_year: 2023,
        role_id: 3,
        status_id: '1',
        acronym: 'P22'
      };

      component.onPressAction(result);

      // phase_year (2023) < phaseYear (2024) and phase_year (2023) !== phaseYear (2024) => true
      expect(component.itemsWithDelete[1].visible).toBe(true);
    });

    it('should set itemsWithDelete[1].visible to false when phase_year equals phaseYear and portfolioAcronym is not P25', () => {
      mockApiService.dataControlSE.IPSRCurrentPhase.portfolioAcronym = 'P22';
      mockApiService.dataControlSE.IPSRCurrentPhase.phaseYear = 2023;
      mockApiService.shouldShowUpdate.mockReturnValue(false);
      const result = {
        id: '1',
        title: 'Test',
        official_code: 'ABC123',
        phase_year: 2023,
        role_id: 3,
        status_id: '1',
        acronym: 'P22'
      };

      component.onPressAction(result);

      expect(component.itemsWithDelete[1].visible).toBe(false);
    });

    describe('non-admin delete button behavior', () => {
      beforeEach(() => {
        mockApiService.rolesSE.isAdmin = false;
      });

      it('should disable delete when role_id is not 3, 4, or 5', () => {
        const result = {
          id: '1',
          title: 'Test',
          official_code: 'ABC123',
          phase_year: 2023,
          role_id: 1,
          status_id: '1',
          acronym: 'P25'
        };

        component.onPressAction(result);

        expect(component.itemsWithDelete[2].disabled).toBe(true);
        expect(component.itemsWithDelete[2].tooltipShow).toBe(true);
        expect(component.itemsWithDelete[2].tooltipText).toContain('contact your leader');
      });

      it('should disable delete when status_id is 2 (QAed)', () => {
        const result = {
          id: '1',
          title: 'Test',
          official_code: 'ABC123',
          phase_year: 2023,
          role_id: 3,
          status_id: '2',
          acronym: 'P25'
        };

        component.onPressAction(result);

        expect(component.itemsWithDelete[2].disabled).toBe(true);
        expect(component.itemsWithDelete[2].tooltipShow).toBe(true);
        expect(component.itemsWithDelete[2].tooltipText).toContain('QAed');
      });

      it('should not disable delete when role_id is 3 and status_id is not 2', () => {
        const result = {
          id: '1',
          title: 'Test',
          official_code: 'ABC123',
          phase_year: 2023,
          role_id: 3,
          status_id: '1',
          acronym: 'P25'
        };

        component.onPressAction(result);

        expect(component.itemsWithDelete[2].disabled).toBe(false);
        expect(component.itemsWithDelete[2].tooltipShow).toBe(false);
      });

      it('should not disable delete when role_id is 4', () => {
        const result = {
          id: '1',
          title: 'Test',
          official_code: 'ABC123',
          phase_year: 2023,
          role_id: 4,
          status_id: '1',
          acronym: 'P25'
        };

        component.onPressAction(result);

        expect(component.itemsWithDelete[2].disabled).toBe(false);
      });

      it('should not disable delete when role_id is 5', () => {
        const result = {
          id: '1',
          title: 'Test',
          official_code: 'ABC123',
          phase_year: 2023,
          role_id: 5,
          status_id: '1',
          acronym: 'P25'
        };

        component.onPressAction(result);

        expect(component.itemsWithDelete[2].disabled).toBe(false);
      });
    });

    describe('admin delete button behavior', () => {
      beforeEach(() => {
        mockApiService.rolesSE.isAdmin = true;
      });

      it('should disable delete when status_id is 2 for admin', () => {
        const result = {
          id: '1',
          title: 'Test',
          official_code: 'ABC123',
          phase_year: 2023,
          role_id: 1,
          status_id: '2',
          acronym: 'P25'
        };

        component.onPressAction(result);

        expect(component.itemsWithDelete[2].disabled).toBe(true);
        expect(component.itemsWithDelete[2].tooltipShow).toBe(true);
        expect(component.itemsWithDelete[2].tooltipText).toContain('QAed');
      });

      it('should NOT disable delete for admin when status_id is not 2', () => {
        const result = {
          id: '1',
          title: 'Test',
          official_code: 'ABC123',
          phase_year: 2023,
          role_id: 1,
          status_id: '1',
          acronym: 'P25'
        };

        component.onPressAction(result);

        expect(component.itemsWithDelete[2].disabled).toBe(false);
        expect(component.itemsWithDelete[2].tooltipShow).toBe(false);
      });
    });

    describe('delete button visibility based on acronym match', () => {
      it('should show delete when portfolioAcronym matches result acronym', () => {
        mockApiService.dataControlSE.IPSRCurrentPhase.portfolioAcronym = 'P25';
        const result = {
          id: '1',
          title: 'Test',
          official_code: 'ABC123',
          phase_year: 2023,
          role_id: 3,
          status_id: '1',
          acronym: 'P25'
        };

        component.onPressAction(result);

        expect(component.itemsWithDelete[2].visible).toBe(true);
      });

      it('should hide delete when portfolioAcronym does not match result acronym', () => {
        mockApiService.dataControlSE.IPSRCurrentPhase.portfolioAcronym = 'P25';
        const result = {
          id: '1',
          title: 'Test',
          official_code: 'ABC123',
          phase_year: 2023,
          role_id: 3,
          status_id: '1',
          acronym: 'P22'
        };

        component.onPressAction(result);

        expect(component.itemsWithDelete[2].visible).toBe(false);
      });
    });

    it('should extract only numbers from official_code', () => {
      const result = {
        id: '1',
        title: 'Test',
        official_code: 'ABC123DEF',
        phase_year: 2023,
        role_id: 3,
        status_id: '1',
        acronym: 'P25'
      };

      component.onPressAction(result);

      expect(component.retrieveModalSE.requester_initiative_id).toBe('123');
    });
  });

  describe('getDeleteTooltipText (private)', () => {
    it('should return QAed message when status_id is 2', () => {
      mockApiService.dataControlSE.currentResult = { status_id: '2', role_id: 3 };
      const result = (component as any).getDeleteTooltipText();
      expect(result).toContain('QAed');
    });

    it('should return leader message when role_id is not 3, 4 or 5 and status_id is not 2', () => {
      mockApiService.dataControlSE.currentResult = { status_id: '1', role_id: 1 };
      const result = (component as any).getDeleteTooltipText();
      expect(result).toContain('contact your leader');
    });

    it('should return empty string when role_id is 3 and status_id is not 2', () => {
      mockApiService.dataControlSE.currentResult = { status_id: '1', role_id: 3 };
      const result = (component as any).getDeleteTooltipText();
      expect(result).toBe('');
    });

    it('should return empty string when role_id is 4 and status_id is not 2', () => {
      mockApiService.dataControlSE.currentResult = { status_id: '1', role_id: 4 };
      const result = (component as any).getDeleteTooltipText();
      expect(result).toBe('');
    });

    it('should return empty string when role_id is 5 and status_id is not 2', () => {
      mockApiService.dataControlSE.currentResult = { status_id: '1', role_id: 5 };
      const result = (component as any).getDeleteTooltipText();
      expect(result).toBe('');
    });
  });

  describe('shouldShowUpdate (private)', () => {
    it('should return true for admin with initiatives and past phase', () => {
      mockApiService.rolesSE.isAdmin = true;
      mockApiService.dataControlSE.IPSRCurrentPhase = { phaseYear: 2024, portfolioAcronym: 'P25' };
      const result = {
        initiative_entity_map: [{ entityId: 1 }],
        phase_year: 2023
      };
      expect((component as any).shouldShowUpdate(result)).toBe(true);
    });

    it('should return false for admin with no initiatives', () => {
      mockApiService.rolesSE.isAdmin = true;
      mockApiService.dataControlSE.IPSRCurrentPhase = { phaseYear: 2024, portfolioAcronym: 'P25' };
      const result = {
        initiative_entity_map: [],
        phase_year: 2023
      };
      expect((component as any).shouldShowUpdate(result)).toBe(false);
    });

    it('should return false for admin when not past phase', () => {
      mockApiService.rolesSE.isAdmin = true;
      mockApiService.dataControlSE.IPSRCurrentPhase = { phaseYear: 2023, portfolioAcronym: 'P25' };
      const result = {
        initiative_entity_map: [{ entityId: 1 }],
        phase_year: 2024
      };
      expect((component as any).shouldShowUpdate(result)).toBe(false);
    });

    it('should return true for non-admin when user is in any initiative and past phase', () => {
      mockApiService.rolesSE.isAdmin = false;
      mockApiService.dataControlSE.IPSRCurrentPhase = { phaseYear: 2024, portfolioAcronym: 'P25' };
      const result = {
        initiative_entity_map: [{ entityId: 1 }],
        initiative_entity_user: [{ initiative_id: 1 }],
        phase_year: 2023
      };
      expect((component as any).shouldShowUpdate(result)).toBe(true);
    });

    it('should return false for non-admin when user is not in any initiative', () => {
      mockApiService.rolesSE.isAdmin = false;
      mockApiService.dataControlSE.IPSRCurrentPhase = { phaseYear: 2024, portfolioAcronym: 'P25' };
      const result = {
        initiative_entity_map: [{ entityId: 1 }],
        initiative_entity_user: [{ initiative_id: 99 }],
        phase_year: 2023
      };
      expect((component as any).shouldShowUpdate(result)).toBe(false);
    });

    it('should handle null initiative_entity_map', () => {
      mockApiService.rolesSE.isAdmin = true;
      mockApiService.dataControlSE.IPSRCurrentPhase = { phaseYear: 2024, portfolioAcronym: 'P25' };
      const result = {
        initiative_entity_map: null,
        phase_year: 2023
      };
      expect((component as any).shouldShowUpdate(result)).toBe(false);
    });
  });

  describe('isPastReportingPhase (private)', () => {
    it('should return true when phase_year < phaseYear', () => {
      mockApiService.dataControlSE.IPSRCurrentPhase = { phaseYear: 2024, portfolioAcronym: 'P25' };
      expect((component as any).isPastReportingPhase({ phase_year: 2023 })).toBe(true);
    });

    it('should return false when phase_year >= phaseYear', () => {
      mockApiService.dataControlSE.IPSRCurrentPhase = { phaseYear: 2024, portfolioAcronym: 'P25' };
      expect((component as any).isPastReportingPhase({ phase_year: 2024 })).toBe(false);
    });

    it('should return false when phase_year is not a number', () => {
      mockApiService.dataControlSE.IPSRCurrentPhase = { phaseYear: 2024, portfolioAcronym: 'P25' };
      expect((component as any).isPastReportingPhase({ phase_year: 'abc' })).toBe(false);
    });

    it('should return false when phaseYear is not a number', () => {
      mockApiService.dataControlSE.IPSRCurrentPhase = { phaseYear: null, portfolioAcronym: 'P25' };
      expect((component as any).isPastReportingPhase({ phase_year: 2023 })).toBe(false);
    });
  });

  describe('isUserIncludedInAnyInitiative (private)', () => {
    it('should return true when mapIds overlap with user initiative ids', () => {
      const result = {
        initiative_entity_map: [{ entityId: 1 }, { entityId: 2 }],
        initiative_entity_user: [{ initiative_id: 2 }]
      };
      expect((component as any).isUserIncludedInAnyInitiative(result)).toBe(true);
    });

    it('should return false when mapIds do not overlap', () => {
      const result = {
        initiative_entity_map: [{ entityId: 1 }],
        initiative_entity_user: [{ initiative_id: 99 }]
      };
      expect((component as any).isUserIncludedInAnyInitiative(result)).toBe(false);
    });

    it('should return false when initiative_entity_user is empty', () => {
      const result = {
        initiative_entity_map: [{ entityId: 1 }],
        initiative_entity_user: []
      };
      expect((component as any).isUserIncludedInAnyInitiative(result)).toBe(false);
    });
  });

  describe('getInitiativeIdsFromMap (private)', () => {
    it('should extract entityIds from initiative_entity_map', () => {
      const result = { initiative_entity_map: [{ entityId: 1 }, { entityId: 2 }] };
      expect((component as any).getInitiativeIdsFromMap(result)).toEqual([1, 2]);
    });

    it('should filter out null/undefined entityIds', () => {
      const result = { initiative_entity_map: [{ entityId: 1 }, { entityId: null }, {}] };
      expect((component as any).getInitiativeIdsFromMap(result)).toEqual([1]);
    });

    it('should handle null initiative_entity_map', () => {
      expect((component as any).getInitiativeIdsFromMap({ initiative_entity_map: null })).toEqual([]);
    });

    it('should handle missing initiative_entity_map', () => {
      expect((component as any).getInitiativeIdsFromMap({})).toEqual([]);
    });
  });

  describe('getUserInitiativeIds (private)', () => {
    it('should extract initiative_ids from initiative_entity_user', () => {
      const result = { initiative_entity_user: [{ initiative_id: 10 }, { initiative_id: 20 }] };
      expect((component as any).getUserInitiativeIds(result)).toEqual([10, 20]);
    });

    it('should filter out null/undefined initiative_ids', () => {
      const result = { initiative_entity_user: [{ initiative_id: 10 }, { initiative_id: null }, {}] };
      expect((component as any).getUserInitiativeIds(result)).toEqual([10]);
    });

    it('should handle null initiative_entity_user', () => {
      expect((component as any).getUserInitiativeIds({ initiative_entity_user: null })).toEqual([]);
    });

    it('should handle missing initiative_entity_user', () => {
      expect((component as any).getUserInitiativeIds({})).toEqual([]);
    });
  });
});

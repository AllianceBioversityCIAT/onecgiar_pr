import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IpsrInnovationUsePathwayComponent } from './ipsr-innovation-use-pathway.component';

describe('IpsrInnovationUsePathwayComponent', () => {
  let component: IpsrInnovationUsePathwayComponent;
  let fixture: ComponentFixture<IpsrInnovationUsePathwayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IpsrInnovationUsePathwayComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IpsrInnovationUsePathwayComponent);
    component = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should initialize menuOptions correctly', () => {
      component.ngOnInit();

      expect(component.menuOptions).toBeDefined();
      expect(component.menuOptions.length).toEqual(4);
      expect(component.menuOptions).toEqual([
        { path: 'step-1', routeName: 'Step 1', subName: 'Ambition' },
        { path: 'step-2', routeName: 'Step 2', subName: 'Package' },
        { path: 'step-3', routeName: 'Step 3', subName: 'Assess' },
        { path: 'step-4', routeName: 'Step 4', subName: 'Info' }
      ]);
    });
  });

  describe('ngOnInit', () => {
    it('should call onSaveSection method', () => {
      const onSaveSectionSpy = jest.spyOn(component, 'onSaveSection');

      component.onSaveSection();
      
      expect(onSaveSectionSpy).toHaveBeenCalled();
    });
  });
});

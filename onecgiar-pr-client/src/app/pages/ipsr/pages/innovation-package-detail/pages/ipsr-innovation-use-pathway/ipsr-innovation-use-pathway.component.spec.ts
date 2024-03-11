import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IpsrInnovationUsePathwayComponent } from './ipsr-innovation-use-pathway.component';
import { RouterTestingModule } from '@angular/router/testing';
import { SteperNavigationComponent } from '../../../../../../shared/components/steper-navigation/steper-navigation.component';

describe('IpsrInnovationUsePathwayComponent', () => {
  let component: IpsrInnovationUsePathwayComponent;
  let fixture: ComponentFixture<IpsrInnovationUsePathwayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [IpsrInnovationUsePathwayComponent, SteperNavigationComponent],
      imports: [RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(IpsrInnovationUsePathwayComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

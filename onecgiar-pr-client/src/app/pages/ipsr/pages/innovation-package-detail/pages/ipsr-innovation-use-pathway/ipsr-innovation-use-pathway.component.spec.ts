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
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

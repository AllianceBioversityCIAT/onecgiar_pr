import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EntityAowUnplannedComponent } from './entity-aow-unplanned.component';

describe('EntityAowUnplannedComponent', () => {
  let component: EntityAowUnplannedComponent;
  let fixture: ComponentFixture<EntityAowUnplannedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: []
    }).compileComponents();

    fixture = TestBed.createComponent(EntityAowUnplannedComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

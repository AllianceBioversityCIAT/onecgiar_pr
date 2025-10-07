import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EntityAowAllComponent } from './entity-aow-all.component';

describe('EntityAowAllComponent', () => {
  let component: EntityAowAllComponent;
  let fixture: ComponentFixture<EntityAowAllComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: []
    }).compileComponents();

    fixture = TestBed.createComponent(EntityAowAllComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

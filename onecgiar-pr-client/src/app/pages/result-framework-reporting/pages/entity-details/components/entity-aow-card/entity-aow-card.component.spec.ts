import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EntityAowCardComponent } from './entity-aow-card.component';
import { ProgressBarModule } from 'primeng/progressbar';

describe('EntityAowCardComponent', () => {
  let component: EntityAowCardComponent;
  let fixture: ComponentFixture<EntityAowCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntityAowCardComponent, ProgressBarModule]
    }).compileComponents();

    fixture = TestBed.createComponent(EntityAowCardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

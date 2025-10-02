import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EntityAowCardComponent } from './entity-aow-card.component';
import { ProgressBarModule } from 'primeng/progressbar';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

describe('EntityAowCardComponent', () => {
  let component: EntityAowCardComponent;
  let fixture: ComponentFixture<EntityAowCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntityAowCardComponent, ProgressBarModule, HttpClientTestingModule, RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(EntityAowCardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InnovationTeamDiversityComponent } from './innovation-team-diversity.component';

describe('InnovationTeamDiversityComponent', () => {
  let component: InnovationTeamDiversityComponent;
  let fixture: ComponentFixture<InnovationTeamDiversityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InnovationTeamDiversityComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InnovationTeamDiversityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

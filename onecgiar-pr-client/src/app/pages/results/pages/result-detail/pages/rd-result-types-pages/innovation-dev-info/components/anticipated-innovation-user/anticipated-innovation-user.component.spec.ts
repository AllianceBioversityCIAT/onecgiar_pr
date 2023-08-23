import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnticipatedInnovationUserComponent } from './anticipated-innovation-user.component';

describe('AnticipatedInnovationUserComponent', () => {
  let component: AnticipatedInnovationUserComponent;
  let fixture: ComponentFixture<AnticipatedInnovationUserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnticipatedInnovationUserComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnticipatedInnovationUserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

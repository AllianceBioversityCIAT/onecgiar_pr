import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditOrDeleteItemButtonComponent } from './edit-or-delete-item-button.component';

describe('EditOrDeleteItemButtonComponent', () => {
  let component: EditOrDeleteItemButtonComponent;
  let fixture: ComponentFixture<EditOrDeleteItemButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditOrDeleteItemButtonComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditOrDeleteItemButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

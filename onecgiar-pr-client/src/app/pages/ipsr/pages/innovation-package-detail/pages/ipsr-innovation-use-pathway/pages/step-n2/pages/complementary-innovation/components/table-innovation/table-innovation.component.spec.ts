import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableInnovationComponent } from './table-innovation.component';

describe('TableInnovationComponent', () => {
  let component: TableInnovationComponent;
  let fixture: ComponentFixture<TableInnovationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TableInnovationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableInnovationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

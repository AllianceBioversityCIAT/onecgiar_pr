import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InnovationPackageCustomTableComponent } from './innovation-package-custom-table.component';

describe('InnovationPackageCustomTableComponent', () => {
  let component: InnovationPackageCustomTableComponent;
  let fixture: ComponentFixture<InnovationPackageCustomTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InnovationPackageCustomTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InnovationPackageCustomTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

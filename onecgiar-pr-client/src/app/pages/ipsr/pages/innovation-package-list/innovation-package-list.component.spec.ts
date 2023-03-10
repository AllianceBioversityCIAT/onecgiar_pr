import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InnovationPackageListComponent } from './innovation-package-list.component';

describe('InnovationPackageListComponent', () => {
  let component: InnovationPackageListComponent;
  let fixture: ComponentFixture<InnovationPackageListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InnovationPackageListComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InnovationPackageListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

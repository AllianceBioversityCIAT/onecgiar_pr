import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InnovationPackageCreatorComponent } from './innovation-package-creator.component';

describe('InnovationPackageCreatorComponent', () => {
  let component: InnovationPackageCreatorComponent;
  let fixture: ComponentFixture<InnovationPackageCreatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InnovationPackageCreatorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InnovationPackageCreatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

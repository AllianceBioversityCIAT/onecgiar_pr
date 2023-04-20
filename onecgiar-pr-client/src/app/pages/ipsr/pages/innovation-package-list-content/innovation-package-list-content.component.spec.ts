import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InnovationPackageListContentComponent } from './innovation-package-list-content.component';

describe('InnovationPackageListContentComponent', () => {
  let component: InnovationPackageListContentComponent;
  let fixture: ComponentFixture<InnovationPackageListContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InnovationPackageListContentComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InnovationPackageListContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TorIpiExternalPartnersComponent } from './tor-ipi-external-partners.component';

describe('TorIpiExternalPartnersComponent', () => {
  let component: TorIpiExternalPartnersComponent;
  let fixture: ComponentFixture<TorIpiExternalPartnersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TorIpiExternalPartnersComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TorIpiExternalPartnersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

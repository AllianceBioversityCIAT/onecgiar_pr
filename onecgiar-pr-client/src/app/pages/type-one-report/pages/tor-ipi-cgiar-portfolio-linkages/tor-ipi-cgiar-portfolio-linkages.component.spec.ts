import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TorIpiCgiarPortfolioLinkagesComponent } from './tor-ipi-cgiar-portfolio-linkages.component';

describe('TorIpiCgiarPortfolioLinkagesComponent', () => {
  let component: TorIpiCgiarPortfolioLinkagesComponent;
  let fixture: ComponentFixture<TorIpiCgiarPortfolioLinkagesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TorIpiCgiarPortfolioLinkagesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TorIpiCgiarPortfolioLinkagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

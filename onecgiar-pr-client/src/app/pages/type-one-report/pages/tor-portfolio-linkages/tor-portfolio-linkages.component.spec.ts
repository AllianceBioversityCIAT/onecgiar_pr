import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TorPortfolioLinkagesComponent } from './tor-portfolio-linkages.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('TorPortfolioLinkagesComponent', () => {
  let component: TorPortfolioLinkagesComponent;
  let fixture: ComponentFixture<TorPortfolioLinkagesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TorPortfolioLinkagesComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(TorPortfolioLinkagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

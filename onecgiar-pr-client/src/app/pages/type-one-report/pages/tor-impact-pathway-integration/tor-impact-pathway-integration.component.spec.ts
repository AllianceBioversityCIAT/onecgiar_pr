import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TorImpactPathwayIntegrationComponent } from './tor-impact-pathway-integration.component';

describe('TorImpactPathwayIntegrationComponent', () => {
  let component: TorImpactPathwayIntegrationComponent;
  let fixture: ComponentFixture<TorImpactPathwayIntegrationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TorImpactPathwayIntegrationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TorImpactPathwayIntegrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TorImpactPathwayIntegrationComponent } from './tor-impact-pathway-integration.component';
import { PrButtonComponent } from '../../../../custom-fields/pr-button/pr-button.component';
import { AlertStatusComponent } from '../../../../custom-fields/alert-status/alert-status.component';
import { TooltipModule } from 'primeng/tooltip';

describe('TorImpactPathwayIntegrationComponent', () => {
  let component: TorImpactPathwayIntegrationComponent;
  let fixture: ComponentFixture<TorImpactPathwayIntegrationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ 
        TorImpactPathwayIntegrationComponent,
        PrButtonComponent,
        AlertStatusComponent
      ],
      imports: [
        TooltipModule
      ]
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

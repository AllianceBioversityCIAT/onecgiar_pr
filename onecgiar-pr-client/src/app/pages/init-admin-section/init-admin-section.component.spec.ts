import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TooltipModule } from 'primeng/tooltip';
import { InitAdminSectionComponent } from './init-admin-section.component';
import { DynamicPanelMenuComponent } from '../../shared/components/dynamic-panel-menu/dynamic-panel-menu.component';

describe('InitAdminSectionComponent', () => {
  let component: InitAdminSectionComponent;
  let fixture: ComponentFixture<InitAdminSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InitAdminSectionComponent, DynamicPanelMenuComponent],
      imports: [HttpClientTestingModule, TooltipModule]
    }).compileComponents();

    fixture = TestBed.createComponent(InitAdminSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

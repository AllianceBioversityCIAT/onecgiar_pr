import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TorPanelMenuComponent } from './tor-panel-menu.component';
import { PrButtonComponent } from '../../../../custom-fields/pr-button/pr-button.component';

describe('TorPanelMenuComponent', () => {
  let component: TorPanelMenuComponent;
  let fixture: ComponentFixture<TorPanelMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        TorPanelMenuComponent,
        PrButtonComponent
      ],
      imports: [
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TorPanelMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

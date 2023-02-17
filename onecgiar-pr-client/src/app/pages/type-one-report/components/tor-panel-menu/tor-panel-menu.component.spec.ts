import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TorPanelMenuComponent } from './tor-panel-menu.component';

describe('TorPanelMenuComponent', () => {
  let component: TorPanelMenuComponent;
  let fixture: ComponentFixture<TorPanelMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TorPanelMenuComponent ]
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

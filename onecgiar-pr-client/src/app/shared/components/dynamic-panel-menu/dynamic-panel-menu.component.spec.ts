import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DynamicPanelMenuComponent } from './dynamic-panel-menu.component';

describe('DynamicPanelMenuComponent', () => {
  let component: DynamicPanelMenuComponent;
  let fixture: ComponentFixture<DynamicPanelMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DynamicPanelMenuComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DynamicPanelMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

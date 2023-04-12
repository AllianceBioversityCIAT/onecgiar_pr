import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SteperNavigationComponent } from './steper-navigation.component';

describe('SteperNavigationComponent', () => {
  let component: SteperNavigationComponent;
  let fixture: ComponentFixture<SteperNavigationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SteperNavigationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SteperNavigationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

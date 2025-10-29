import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageAlertComponent } from './page-alert.component';

describe('PageAlertComponent', () => {
  let component: PageAlertComponent;
  let fixture: ComponentFixture<PageAlertComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PageAlertComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PageAlertComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return warning title and message when type is warning', () => {
    component.type = 'warning';
    expect(component.title).toBe('Something went wrong');
    expect(component.message).toBe('Please review the link provided. It seems there is something incorrect or missing.');
  });

  it('should return error title and message when type is error', () => {
    component.type = 'error';
    expect(component.title).toBe('Sorry!');
    expect(component.message).toBe('We are currently experiencing a technical issue with the tool. Please contact the support team at PRMSTechSupport@cgiar.org and try again in a few hours.');
  });

  it('should return empty strings when type is unknown', () => {
    component.type = 'info' as any;
    expect(component.title).toBe('');
    expect(component.message).toBe('');
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [AppComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it(`should have as title 'onecgiar-pr-client'`, () => {
    expect(component.title).toEqual('onecgiar-pr-client');
  });

  describe('On init', () => {
    it('should have a method copyTokenToClipboard', () => {
      const copyTokenToClipboardSpy = jest.spyOn(component, 'copyTokenToClipboard');
      component.ngOnInit();
      expect(copyTokenToClipboardSpy).toHaveBeenCalled();
    });
    it('shoud have a method copyTokenToClipboard', () => {
      expect(component.copyTokenToClipboard).toBeDefined();
    });
  });
});

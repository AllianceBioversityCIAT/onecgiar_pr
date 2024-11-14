import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WpHomeComponent } from './wp-home.component';
import { CommonModule } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

describe('WpHomeComponent', () => {
  let component: WpHomeComponent;
  let fixture: ComponentFixture<WpHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, WpHomeComponent, HttpClientTestingModule, RouterTestingModule],
      declarations: []
    }).compileComponents();

    fixture = TestBed.createComponent(WpHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call outcomeIService.searchText.set with an empty string on ngOnDestroy', () => {
    const spy = jest.spyOn(component.outcomeIService.searchText, 'set');
    component.ngOnDestroy();
    expect(spy).toHaveBeenCalledWith('');
  });
});

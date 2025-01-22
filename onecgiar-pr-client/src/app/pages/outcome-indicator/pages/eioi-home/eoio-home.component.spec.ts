import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EoioHomeComponent } from './eoio-home.component';
import { CommonModule } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

describe('EoioHomeComponent', () => {
  let component: EoioHomeComponent;
  let fixture: ComponentFixture<EoioHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, EoioHomeComponent, HttpClientTestingModule, RouterTestingModule],
      declarations: []
    }).compileComponents();

    fixture = TestBed.createComponent(EoioHomeComponent);
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

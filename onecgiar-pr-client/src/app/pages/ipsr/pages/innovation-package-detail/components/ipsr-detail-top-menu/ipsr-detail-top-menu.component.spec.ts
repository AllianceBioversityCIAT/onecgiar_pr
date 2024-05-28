import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IpsrDetailTopMenuComponent } from './ipsr-detail-top-menu.component';
import { IpsrGreenCheckComponent } from '../../../../components/ipsr-green-check/ipsr-green-check.component';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('IpsrDetailTopMenuComponent', () => {
  let component: IpsrDetailTopMenuComponent;
  let fixture: ComponentFixture<IpsrDetailTopMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        IpsrDetailTopMenuComponent,
        IpsrGreenCheckComponent
      ],
      imports: [
        RouterTestingModule,
        HttpClientTestingModule
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IpsrDetailTopMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

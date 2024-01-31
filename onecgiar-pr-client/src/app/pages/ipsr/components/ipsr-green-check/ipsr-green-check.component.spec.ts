import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { IpsrGreenCheckComponent } from './ipsr-green-check.component';

describe('IpsrGreenCheckComponent', () => {
  let component: IpsrGreenCheckComponent;
  let fixture: ComponentFixture<IpsrGreenCheckComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [IpsrGreenCheckComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(IpsrGreenCheckComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { IpsrComponent } from './ipsr.component';

describe('IpsrComponent', () => {
  let component: IpsrComponent;
  let fixture: ComponentFixture<IpsrComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [IpsrComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(IpsrComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

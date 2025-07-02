import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TorWhiteComponent } from './tor-white.component';

describe('TorWhiteComponent', () => {
  let component: TorWhiteComponent;
  let fixture: ComponentFixture<TorWhiteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TorWhiteComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TorWhiteComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

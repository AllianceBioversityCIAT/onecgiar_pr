import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { InnoDevContentComponent } from './inno-dev-content.component';

describe('InnoDevContentComponent', () => {
  let component: InnoDevContentComponent;
  let fixture: ComponentFixture<InnoDevContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InnoDevContentComponent, HttpClientTestingModule, NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(InnoDevContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

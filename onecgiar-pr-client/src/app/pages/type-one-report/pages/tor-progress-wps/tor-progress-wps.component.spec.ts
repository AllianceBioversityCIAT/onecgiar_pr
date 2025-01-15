import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TorProgressWpsComponent } from './tor-progress-wps.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('TorProgressWpsComponent', () => {
  let component: TorProgressWpsComponent;
  let fixture: ComponentFixture<TorProgressWpsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(TorProgressWpsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should change requesting to false after 2 seconds', done => {
    component.exportExcel();
    expect(component.requesting).toBe(true);

    setTimeout(() => {
      expect(component.requesting).toBe(false);
      done();
    }, 2000);
  });

  it('should not change requesting state if exportExcel is called while already requesting', () => {
    component.requesting = true;
    component.exportExcel();
    expect(component.requesting).toBe(true);
  });
});

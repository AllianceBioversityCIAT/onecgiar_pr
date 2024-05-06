import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StepN1ScalingAmbitionBlurbComponent } from './step-n1-scaling-ambition-blurb.component';
import { ToastModule } from 'primeng/toast';

describe('StepN1ScalingAmbitionBlurbComponent', () => {
  let component: StepN1ScalingAmbitionBlurbComponent;
  let fixture: ComponentFixture<StepN1ScalingAmbitionBlurbComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StepN1ScalingAmbitionBlurbComponent],
      imports: [ToastModule]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN1ScalingAmbitionBlurbComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should add a message when onCopy is called', () => {
    const addSpy = jest.spyOn(component.messageSE, 'add');
    component.onCopy();
    expect(addSpy).toHaveBeenCalledWith({
      key: 'copykey',
      severity: 'info',
      summary: 'Copied',
      detail: 'Description copied'
    });
  });
});

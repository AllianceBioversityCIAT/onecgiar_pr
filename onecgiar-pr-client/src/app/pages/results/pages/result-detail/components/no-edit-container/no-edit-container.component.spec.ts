import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoEditContainerComponent } from './no-edit-container.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('NoEditContainerComponent', () => {
  let component: NoEditContainerComponent;
  let fixture: ComponentFixture<NoEditContainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NoEditContainerComponent ],
      imports: [
        HttpClientTestingModule,
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(NoEditContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

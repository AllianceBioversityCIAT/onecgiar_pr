import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfReportsComponent } from './pdf-reports.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';

describe('PdfReportsComponent', () => {
  let component: PdfReportsComponent;
  let fixture: ComponentFixture<PdfReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PdfReportsComponent],
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => {
                  return 'id';
                }
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PdfReportsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

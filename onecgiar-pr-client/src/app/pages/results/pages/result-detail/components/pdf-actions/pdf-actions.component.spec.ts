import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfActionsComponent } from './pdf-actions.component';

describe('PdfActionsComponent', () => {
  let component: PdfActionsComponent;
  let fixture: ComponentFixture<PdfActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PdfActionsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PdfActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

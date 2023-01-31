import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimpleTableWithClipboardComponent } from './simple-table-with-clipboard.component';

describe('SimpleTableWithClipboardComponent', () => {
  let component: SimpleTableWithClipboardComponent;
  let fixture: ComponentFixture<SimpleTableWithClipboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SimpleTableWithClipboardComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SimpleTableWithClipboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

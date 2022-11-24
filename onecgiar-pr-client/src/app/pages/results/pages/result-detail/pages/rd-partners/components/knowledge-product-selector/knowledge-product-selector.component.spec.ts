import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KnowledgeProductSelectorComponent } from './knowledge-product-selector.component';

describe('KnowledgeProductSelectorComponent', () => {
  let component: KnowledgeProductSelectorComponent;
  let fixture: ComponentFixture<KnowledgeProductSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [KnowledgeProductSelectorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(KnowledgeProductSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

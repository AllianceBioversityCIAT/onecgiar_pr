import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KnowledgeProductInfoComponent } from './knowledge-product-info.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('KnowledgeProductInfoComponent', () => {
  let component: KnowledgeProductInfoComponent;
  let fixture: ComponentFixture<KnowledgeProductInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [KnowledgeProductInfoComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(KnowledgeProductInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

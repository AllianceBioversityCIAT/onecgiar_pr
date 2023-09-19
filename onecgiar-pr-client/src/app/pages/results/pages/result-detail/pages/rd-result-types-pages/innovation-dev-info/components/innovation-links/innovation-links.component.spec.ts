import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InnovationLinksComponent } from './innovation-links.component';

describe('InnovationLinksComponent', () => {
  let component: InnovationLinksComponent;
  let fixture: ComponentFixture<InnovationLinksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InnovationLinksComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InnovationLinksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TorTocDiagramsComponent } from './tor-toc-diagrams.component';

describe('TorTocDiagramsComponent', () => {
  let component: TorTocDiagramsComponent;
  let fixture: ComponentFixture<TorTocDiagramsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TorTocDiagramsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TorTocDiagramsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

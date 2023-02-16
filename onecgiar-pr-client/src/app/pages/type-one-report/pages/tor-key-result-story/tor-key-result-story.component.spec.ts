import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TorKeyResultStoryComponent } from './tor-key-result-story.component';

describe('TorKeyResultStoryComponent', () => {
  let component: TorKeyResultStoryComponent;
  let fixture: ComponentFixture<TorKeyResultStoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TorKeyResultStoryComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TorKeyResultStoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

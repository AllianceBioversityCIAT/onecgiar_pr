import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchUserSelectComponent } from './search-user-select.component';

describe('SearchUserSelectComponent', () => {
  let component: SearchUserSelectComponent;
  let fixture: ComponentFixture<SearchUserSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchUserSelectComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchUserSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

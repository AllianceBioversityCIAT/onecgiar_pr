import { YmzListStructureItemDirective } from './ymz-list-structure-item.directive';
import { RolesService } from '../../services/global/roles.service';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';

@Component({
  standalone: false,
  template: '<div class="clickEvent" appYmzListStructureItem (deleteEvent)="onDelete()"></div>'
})
class TestComponent {
  onDelete() {}
}

describe('YmzListStructureItemDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;
  let el: DebugElement;
  let mockRolesService:any

  beforeEach(() => {
    mockRolesService = {
      readOnly: false
    }
    TestBed.configureTestingModule({
      declarations: [
        YmzListStructureItemDirective,
        TestComponent
      ],
      providers: [
        {
          provide: RolesService,
          useValue: mockRolesService
        }
      ],
      imports: [
        HttpClientModule,
      ],
    });

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    el = fixture.debugElement;
  });

  afterEach(() => {
    if (fixture && typeof fixture.destroy === 'function') {
      fixture.destroy();
    }
  });

  it('should add class to host element', () => {
    const hostElement = el.query(By.directive(YmzListStructureItemDirective)).nativeElement;
    expect(hostElement.classList.contains('ymz-list-structure-item')).toBeTruthy();
  });

  it('should emit deleteEvent on click', () => {
    const hostElement = el.query(By.directive(YmzListStructureItemDirective)).nativeElement;

    const spy = jest.spyOn(component, 'onDelete');

    hostElement.click();
    fixture.detectChanges();

    expect(spy).toHaveBeenCalled();
  });

  it('should create and append div with delete icon if not in read-only mode', () => {
    fixture.detectChanges();

    const deleteIcon = el.query(By.css('.clickEvent.deleteItem i.material-icons-round.ymz-lsi-delete-icon'));
    const divElement = el.query(By.css('.clickEvent.deleteItem'));

    expect(divElement).toBeTruthy();
    expect(deleteIcon).toBeTruthy();
    expect(deleteIcon.nativeElement.innerText).toContain('delete');
    expect(mockRolesService.readOnly).toBeFalsy();
  });

  it('should not create delete icon and should not append div if in read-only mode', () => {
    mockRolesService.readOnly = true;
    TestBed.inject(RolesService);
    fixture.detectChanges();

    const divElement = el.query(By.css('.clickEvent.deleteItem'));
    const deleteIcon = el.query(By.css('.clickEvent.deleteItem i.material-icons-round.ymz-lsi-delete-icon'));

    expect(divElement).toBeFalsy();
    expect(deleteIcon).toBeFalsy();
    expect(mockRolesService.readOnly).toBeTruthy();
  });
});

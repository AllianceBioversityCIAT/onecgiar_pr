import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { StudiesLinkComponent } from './studies-link.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

class ApiServiceStub {
  rolesSE = { readOnly: false };
}

describe('StudiesLinkComponent', () => {
  let component: StudiesLinkComponent;
  let fixture: ComponentFixture<StudiesLinkComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StudiesLinkComponent],
      imports: [HttpClientTestingModule],
      providers: [
        { provide: (await import('../../../../services/api/api.service')).ApiService, useClass: ApiServiceStub }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(StudiesLinkComponent);
    component = fixture.componentInstance;
    component.body = {} as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit should initialize scaling_studies_urls with one empty string', () => {
    component.body = {} as any;
    component.ngOnInit();
    expect(component.body.scaling_studies_urls).toEqual(['']);
  });

  it('addStudiesLink should remove existing empty strings and push a new empty string', () => {
    component.body = { scaling_studies_urls: ['', 'http://a'] } as any;
    component.addStudiesLink();
    expect(component.body.scaling_studies_urls).toEqual(['http://a', '']);
  });

  it('deleteStudiesLink should remove by index', () => {
    component.body = { scaling_studies_urls: ['a', 'b', 'c'] } as any;
    component.deleteStudiesLink(1);
    expect(component.body.scaling_studies_urls).toEqual(['a', 'c']);
  });

  it('trackByIndex should return the index', () => {
    expect(component.trackByIndex(3, {})).toBe(3);
  });

  // P2-3426: in read-only mode the list must never seed the phantom empty row. That '' is not just
  // a blank input the user cannot fill — the body is round-tripped into the Step 4 PATCH, so it
  // would be persisted as a stored study URL of the package.
  describe('read-only mode (P2-3426)', () => {
    it('does not inject an empty string when disabled and the list is empty', () => {
      component.body = {} as any;
      component.disabled = true;

      component.ngOnInit();

      expect(component.body.scaling_studies_urls).toEqual([]);
    });

    it('leaves stored links untouched when disabled', () => {
      component.body = { scaling_studies_urls: ['https://a.org/study'] } as any;
      component.disabled = true;

      component.ngOnInit();

      expect(component.body.scaling_studies_urls).toEqual(['https://a.org/study']);
    });

    it('still seeds the empty row in the editable case (unchanged behaviour)', () => {
      component.body = {} as any;
      component.disabled = false;

      component.ngOnInit();

      expect(component.body.scaling_studies_urls).toEqual(['']);
    });
  });
});



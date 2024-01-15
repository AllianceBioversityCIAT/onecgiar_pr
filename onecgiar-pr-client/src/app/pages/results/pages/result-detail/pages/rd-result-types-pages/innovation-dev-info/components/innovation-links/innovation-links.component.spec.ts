import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InnovationLinksComponent } from './innovation-links.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('InnovationLinksComponent', () => {
  let component: InnovationLinksComponent;
  let fixture: ComponentFixture<InnovationLinksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InnovationLinksComponent ],
      imports: [
        HttpClientTestingModule,
      ],

    })
    .compileComponents();

    fixture = TestBed.createComponent(InnovationLinksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('picturesLinksAlertText()', () => {
    it('should return pictures links alert text', () => {
      const alertText = component.picturesLinksAlertText();
      expect(alertText).toEqual('Pictures links (Min. 1)');
    });
  });

  describe('referencesLinksAlertText()', () => {
    it('should return references links alert text', () => {
      const alertText = component.referencesLinksAlertText();
      expect(alertText).toEqual('References links (Min.1)');
    });
  });

  describe('temporalLinkDescription()', () => {
    it('should return temporal link description', () => {
      const description = component.temporalLinkDescription();
      
      expect(description).toContain('high-resolution images');
      expect(description).toContain('final report of the survey');
    });
  });

  describe('temporalReferenceDescription()', () => {
    it('should return temporal reference description', () => {
      const description = component.temporalReferenceDescription();

      expect(description).toContain('Reference materials may include (science) publications, websites, newsletters, reports, newspaper articles, videos, etc.');
    });
  });

  describe('addLinkPictures()', () => {
    it('should add a link to pictures if the array is empty', () => {
      component.body.pictures = [];

      component.addLinkPictures();
  
      expect(component.body.pictures).toHaveLength(1);
      expect(component.body.pictures[0].link).toBe('');
    });
    it('should add a link to pictures', () => {
      component.body.pictures = [{ link: '' }, { link: 'https://test.com' }];
  
      component.addLinkPictures();
  
      expect(component.body.pictures).toHaveLength(2);
      expect(component.body.pictures[0].link).toBe('https://test.com');
      expect(component.body.pictures[1].link).toBe('');

    });
  });

  describe('deleteLinkPictures()', () => {
    it('should delete a link from pictures', () => {
      component.body.pictures = [
        { link: 'https://test.com/link1' },
        { link: 'https://test.com/link2' },
      ];
  
      component.deleteLinkPictures(1);
  
      expect(component.body.pictures).toHaveLength(1);
      expect(component.body.pictures).toEqual([{ link: 'https://test.com/link1' }])
    });
  });

  describe('addLinkReferences()', () => {
    it('should add a new link to reference materials if the array is empty', () => {
      component.body.reference_materials = [];

      component.addLinkReferences();
  
      expect(component.body.reference_materials).toHaveLength(1);
      expect(component.body.reference_materials[0].link).toBe('');
    });
    it('should add a new link to reference materials', () => {
      component.body.reference_materials = [
        { link: 'https://test.com/link1' },
        { link: '' },
        { link: 'https://test.com/link2' },
      ];
  
      component.addLinkReferences();
  
      expect(component.body.reference_materials).toHaveLength(3);
      expect(component.body.reference_materials[0].link).toBe('https://test.com/link1');
      expect(component.body.reference_materials[1].link).toBe('https://test.com/link2');
      expect(component.body.reference_materials[2].link).toBe('');
    });
  });

  describe('deleteLinkReferences()', () => {
    it('should delete a link from reference materials based on the provided index', () => {
      component.body.reference_materials = [
        { link: 'https://test.com/link1' },
        { link: 'https://test.com/link2' },
      ];
  
      component.deleteLinkReferences(1);
  
      expect(component.body.reference_materials).toHaveLength(1);
      expect(component.body.reference_materials).toEqual([{ link: 'https://test.com/link1' }]);
    });
  });
});

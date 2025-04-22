import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicNotionBlockComponent } from './dynamic-notion-block.component';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { WhatsNewService } from '../../../pages/whats-new/services/whats-new.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('DynamicNotionBlockComponent', () => {
  let component: DynamicNotionBlockComponent;
  let fixture: ComponentFixture<DynamicNotionBlockComponent>;
  let router: Router;
  let whatsNewService: WhatsNewService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [],
      providers: [WhatsNewService, DynamicNotionBlockComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DynamicNotionBlockComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    whatsNewService = TestBed.inject(WhatsNewService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('navigateToChildPage', () => {
    it('should navigate to the correct route with the provided id', () => {
      const navigateSpy = jest.spyOn(router, 'navigate');
      const testId = 'test-id-123';

      component.navigateToChildPage(testId);

      expect(navigateSpy).toHaveBeenCalledWith(['/whats-new/details', testId]);
    });
  });

  describe('joinText', () => {
    it('should return empty string when text is null or empty', () => {
      expect(component.joinText(null)).toBe('');
      expect(component.joinText([])).toBe('');
    });

    it('should return plain text when no annotations are present', () => {
      const text = [{ plain_text: 'Hello World' }];
      expect(component.joinText(text)).toBe('Hello World');
    });

    it('should apply bold formatting', () => {
      const text = [
        {
          plain_text: 'Bold Text',
          annotations: { bold: true }
        }
      ];
      expect(component.joinText(text)).toBe('<span class="text-semibold">Bold Text</span>');
    });

    it('should apply italic formatting', () => {
      const text = [
        {
          plain_text: 'Italic Text',
          annotations: { italic: true }
        }
      ];
      expect(component.joinText(text)).toBe('<em>Italic Text</em>');
    });

    it('should apply underline formatting', () => {
      const text = [
        {
          plain_text: 'Underlined Text',
          annotations: { underline: true }
        }
      ];
      expect(component.joinText(text)).toBe('<u>Underlined Text</u>');
    });

    it('should apply strikethrough formatting', () => {
      const text = [
        {
          plain_text: 'Strikethrough Text',
          annotations: { strikethrough: true }
        }
      ];
      expect(component.joinText(text)).toBe('<s>Strikethrough Text</s>');
    });

    it('should apply code formatting', () => {
      const text = [
        {
          plain_text: 'Code Text',
          annotations: { code: true }
        }
      ];
      expect(component.joinText(text)).toBe('<code class="notion-code">Code Text</code>');
    });

    it('should apply link formatting', () => {
      const text = [
        {
          plain_text: 'Link Text',
          href: 'https://example.com'
        }
      ];
      expect(component.joinText(text)).toBe(
        '<a href="https://example.com" target="_blank" rel="noopener noreferrer" class="notion-link">Link Text</a>'
      );
    });

    it('should apply link formatting with mention', () => {
      const text = [
        {
          plain_text: 'Link Text',
          href: 'https://example.com',
          mention: true
        }
      ];
      expect(component.joinText(text)).toBe(
        '<a href="https://example.com" target="_blank" rel="noopener noreferrer" class="notion-link">https://example.com</a>'
      );
    });

    it('should apply multiple annotations to the same text', () => {
      const text = [
        {
          plain_text: 'Bold Italic Text',
          annotations: { bold: true, italic: true }
        }
      ];
      expect(component.joinText(text)).toBe('<em><span class="text-semibold">Bold Italic Text</span></em>');
    });

    it('should join multiple text items', () => {
      const text = [{ plain_text: 'First ' }, { plain_text: 'Second', annotations: { bold: true } }, { plain_text: ' Third' }];
      expect(component.joinText(text)).toBe('First <span class="text-semibold">Second</span> Third');
    });
  });
});

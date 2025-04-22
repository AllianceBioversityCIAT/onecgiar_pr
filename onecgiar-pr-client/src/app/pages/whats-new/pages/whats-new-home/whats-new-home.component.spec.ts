import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WhatsNewHomeComponent } from './whats-new-home.component';
import { WhatsNewService } from '../../services/whats-new.service';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('WhatsNewHomeComponent', () => {
  let component: WhatsNewHomeComponent;
  let fixture: ComponentFixture<WhatsNewHomeComponent>;
  let whatsNewService: WhatsNewService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WhatsNewHomeComponent, RouterTestingModule, HttpClientTestingModule],
      providers: [WhatsNewService]
    }).compileComponents();

    fixture = TestBed.createComponent(WhatsNewHomeComponent);
    component = fixture.componentInstance;
    whatsNewService = TestBed.inject(WhatsNewService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('setActiveNotionPageData', () => {
    it('should set active notion page data with correct structure', () => {
      const mockItem = {
        cover: 'test-cover',
        properties: { title: 'Test Title' },
        id: '123'
      };

      const setSpy = jest.spyOn(whatsNewService.activeNotionPageData, 'set');

      component.setActiveNotionPageData(mockItem);

      expect(setSpy).toHaveBeenCalledWith({
        headerInfo: {
          cover: mockItem.cover,
          properties: mockItem.properties,
          id: mockItem.id
        }
      });
    });
  });
});

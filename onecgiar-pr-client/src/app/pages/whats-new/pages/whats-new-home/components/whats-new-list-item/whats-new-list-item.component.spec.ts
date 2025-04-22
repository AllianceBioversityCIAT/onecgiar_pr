import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WhatsNewListItemComponent } from './whats-new-list-item.component';
import { WhatsNewService } from '../../../../services/whats-new.service';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('WhatsNewListItemComponent', () => {
  let component: WhatsNewListItemComponent;
  let fixture: ComponentFixture<WhatsNewListItemComponent>;
  let mockWhatsNewService: jest.Mocked<WhatsNewService>;

  const mockItem = {
    id: '123',
    properties: {
      Name: {
        title: [
          {
            plain_text: 'Test Title'
          }
        ]
      },
      Tags: {
        select: {
          name: 'Feature',
          color: 'blue'
        }
      },
      Projects: {
        multi_select: [
          {
            name: 'Project 1',
            color: 'green'
          },
          {
            name: 'Project 2',
            color: 'purple'
          }
        ]
      },
      Created: {
        created_time: '2023-01-15T12:00:00Z'
      }
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, TooltipModule, HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(WhatsNewListItemComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should inject WhatsNewService', () => {
    expect(component.whatsNewService).toBeTruthy();
  });

  it('should render item title correctly', () => {
    component.item = mockItem;
    fixture.detectChanges();

    const titleElement = fixture.nativeElement.querySelector('.whats-new-home_list_item_title');
    expect(titleElement.textContent.trim()).toBe('Test Title');
  });

  it('should render date correctly', () => {
    component.item = mockItem;
    fixture.detectChanges();

    const dateElement = fixture.nativeElement.querySelector('.whats-new-home_date');
    expect(dateElement.textContent.trim()).toBe('Jan 15, 2023');
  });

  it('should display "No tags or projects" when no tags or projects are present', () => {
    const itemWithoutTags = {
      ...mockItem,
      properties: {
        ...mockItem.properties,
        Tags: { select: null },
        Projects: { multi_select: [] }
      }
    };

    component.item = itemWithoutTags;
    fixture.detectChanges();

    const noTagsText = fixture.nativeElement.querySelector('.whats-new-home_text_tags').textContent.trim();
    expect(noTagsText).toBe('No tags or projects');
  });
});

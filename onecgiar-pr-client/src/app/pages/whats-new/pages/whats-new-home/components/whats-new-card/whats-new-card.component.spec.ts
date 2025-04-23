import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WhatsNewCardComponent } from './whats-new-card.component';
import { WhatsNewService } from '../../../../services/whats-new.service';
import { TooltipModule } from 'primeng/tooltip';
import { CommonModule } from '@angular/common';

describe('WhatsNewCardComponent', () => {
  let component: WhatsNewCardComponent;
  let fixture: ComponentFixture<WhatsNewCardComponent>;
  let whatsNewService: jest.Mocked<WhatsNewService>;

  beforeEach(async () => {
    whatsNewService = {
      getColor: jest.fn()
    } as unknown as jest.Mocked<WhatsNewService>;

    await TestBed.configureTestingModule({
      imports: [WhatsNewCardComponent, TooltipModule, CommonModule],
      providers: [{ provide: WhatsNewService, useValue: whatsNewService }]
    }).compileComponents();

    fixture = TestBed.createComponent(WhatsNewCardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with input item', () => {
    const mockItem = { id: 1, title: 'Test Item' };
    component.item = mockItem;
    expect(component.item).toEqual(mockItem);
  });

  it('should have WhatsNewService injected', () => {
    expect(component.whatsNewService).toBeDefined();
  });
});

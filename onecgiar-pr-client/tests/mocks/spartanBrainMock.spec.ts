import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  BrnTabs,
  BrnTabsContent,
  BrnTabsContentLazy,
  BrnTabsImports,
  BrnTabsList,
  BrnTabsPaginatedList,
  BrnTabsTrigger,
} from '@spartan-ng/brain/tabs';

@Component({
  standalone: true,
  imports: [BrnTabsImports],
  template: `
    <div [brnTabs]="activeTab()" (brnTabsChange)="onTabChange($event)" (tabActivated)="onTabActivated($event)">
      <div brnTabsList orientation="horizontal">
        <button id="trigger-tab1" brnTabsTrigger="tab1">Tab 1</button>
        <button id="trigger-tab2" brnTabsTrigger="tab2" [disabled]="true">Tab 2</button>
      </div>
      <div id="content-tab1" brnTabsContent="tab1">Content 1</div>
      <div id="content-tab2" brnTabsContent="tab2">
        <ng-template brnTabsContentLazy>Lazy Content 2</ng-template>
      </div>
    </div>
  `
})
class TestHostComponent {
  readonly activeTab = signal('tab1');
  onTabChange(_tab: string) {}
  onTabActivated(_tab: string) {}
}

describe('Spartan brain tabs mock (@spartan-ng/brain/tabs)', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let hostComponent: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Exports and aliases', () => {
    it('should export all standard BrnTabs symbols', () => {
      expect(BrnTabs).toBeDefined();
      expect(BrnTabsList).toBeDefined();
      expect(BrnTabsTrigger).toBeDefined();
      expect(BrnTabsContent).toBeDefined();
      expect(BrnTabsContentLazy).toBeDefined();
      expect(BrnTabsPaginatedList).toBeDefined();
    });

    it('should include all 5 directives in BrnTabsImports', () => {
      expect(BrnTabsImports).toEqual([
        BrnTabs,
        BrnTabsList,
        BrnTabsTrigger,
        BrnTabsContent,
        BrnTabsContentLazy
      ]);
    });
  });

  describe('TestBed compilation and accessibility roles', () => {
    it('should compile and render tablist element with role="tablist" and aria-orientation="horizontal"', () => {
      const listEl = fixture.debugElement.query(By.directive(BrnTabsList)).nativeElement as HTMLElement;
      expect(listEl).toBeTruthy();
      expect(listEl.getAttribute('role')).toBe('tablist');
      expect(listEl.getAttribute('aria-orientation')).toBe('horizontal');
    });

    it('should compile and render tab triggers with role="tab" and accessibility attributes', () => {
      const trigger1El = fixture.debugElement.query(By.css('#trigger-tab1')).nativeElement as HTMLButtonElement;
      const trigger2El = fixture.debugElement.query(By.css('#trigger-tab2')).nativeElement as HTMLButtonElement;

      expect(trigger1El.getAttribute('role')).toBe('tab');
      expect(trigger1El.getAttribute('aria-selected')).toBe('true');
      expect(trigger1El.getAttribute('aria-controls')).toBe('tab1');
      expect(trigger1El.getAttribute('data-state')).toBe('active');
      expect(trigger1El.getAttribute('tabindex')).toBe('0');

      expect(trigger2El.getAttribute('role')).toBe('tab');
      expect(trigger2El.getAttribute('aria-selected')).toBe('false');
      expect(trigger2El.getAttribute('aria-controls')).toBe('tab2');
      expect(trigger2El.getAttribute('data-state')).toBe('inactive');
      expect(trigger2El.getAttribute('tabindex')).toBe('-1');
      expect(trigger2El.disabled).toBe(true);
    });

    it('should compile and render tabpanel element with role="tabpanel", tabindex="0", and aria-labelledby', () => {
      const content1El = fixture.debugElement.query(By.css('#content-tab1')).nativeElement as HTMLElement;
      expect(content1El).toBeTruthy();
      expect(content1El.getAttribute('role')).toBe('tabpanel');
      expect(content1El.getAttribute('tabindex')).toBe('0');
      expect(content1El.getAttribute('aria-labelledby')).toBe('tab1');
    });

    it('should update trigger attributes when activeTab changes', () => {
      hostComponent.activeTab.set('tab2');
      fixture.detectChanges();

      const trigger1El = fixture.debugElement.query(By.css('#trigger-tab1')).nativeElement as HTMLButtonElement;
      const trigger2El = fixture.debugElement.query(By.css('#trigger-tab2')).nativeElement as HTMLButtonElement;

      expect(trigger1El.getAttribute('aria-selected')).toBe('false');
      expect(trigger1El.getAttribute('data-state')).toBe('inactive');
      expect(trigger1El.getAttribute('tabindex')).toBe('-1');

      expect(trigger2El.getAttribute('aria-selected')).toBe('true');
      expect(trigger2El.getAttribute('data-state')).toBe('active');
      expect(trigger2El.getAttribute('tabindex')).toBe('0');
    });

    it('should support brnTabsChange and tabActivated event emitters', () => {
      const brnTabsDir = fixture.debugElement.query(By.directive(BrnTabs)).injector.get(BrnTabs);
      const changeSpy = jest.spyOn(hostComponent, 'onTabChange');
      const activatedSpy = jest.spyOn(hostComponent, 'onTabActivated');

      brnTabsDir.brnTabsChange.emit('tab2');
      brnTabsDir.tabActivated.emit('tab2');

      expect(changeSpy).toHaveBeenCalledWith('tab2');
      expect(activatedSpy).toHaveBeenCalledWith('tab2');
    });
  });
});

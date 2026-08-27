import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { SectionTypeSpecificComponent } from './section-type-specific.component';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { TypePolicyChangeComponent } from './type-policy-change/type-policy-change.component';
import { TypeInnovationUseComponent } from './type-innovation-use/type-innovation-use.component';
import { TypeCapacitySharingComponent } from './type-capacity-sharing/type-capacity-sharing.component';
import { TypeKnowledgeProductComponent } from './type-knowledge-product/type-knowledge-product.component';
import { TypeInnovationDevComponent } from './type-innovation-dev/type-innovation-dev.component';

/**
 * This component is the ROUTER of the bilateral form: it decides which type-specific form is
 * painted for the open result. The mapping broke twice on this branch (360a42447, ec71908ab)
 * because nothing pinned it down, so this spec fixes the WHOLE table — which type paints which
 * form, and which types paint none at all.
 *
 * The five child forms are removed from the component's `imports` so their own dependency trees
 * (api services, control lists, auto-save…) stay out of this test. `errorOnUnknownElements` is
 * off in `setup-jest.ts`, so each child renders as an inert custom element whose presence is the
 * assertion: `<app-type-policy-change>` in the DOM means the router picked Policy Change.
 */
describe('SectionTypeSpecificComponent', () => {
  let fixture: ComponentFixture<SectionTypeSpecificComponent>;
  let component: SectionTypeSpecificComponent;
  let creation: { resultTypeId: ReturnType<typeof signal<number | null>> };

  /** Every child selector the template can paint — used to assert exclusivity. */
  const ALL_FORMS = [
    'app-type-policy-change',
    'app-type-innovation-use',
    'app-type-capacity-sharing',
    'app-type-knowledge-product',
    'app-type-innovation-dev'
  ] as const;

  const render = (typeId: number | null) => {
    creation.resultTypeId.set(typeId);
    fixture = TestBed.createComponent(SectionTypeSpecificComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  /** Which of the five forms are currently in the DOM. */
  const paintedForms = (host: HTMLElement) => ALL_FORMS.filter(sel => !!host.querySelector(sel));

  beforeEach(async () => {
    creation = { resultTypeId: signal<number | null>(null) };

    await TestBed.configureTestingModule({
      imports: [SectionTypeSpecificComponent],
      providers: [{ provide: BilateralCreationService, useValue: creation }]
    })
      .overrideComponent(SectionTypeSpecificComponent, {
        remove: {
          imports: [
            TypePolicyChangeComponent,
            TypeInnovationUseComponent,
            TypeCapacitySharingComponent,
            TypeKnowledgeProductComponent,
            TypeInnovationDevComponent
          ]
        }
      })
      .compileComponents();
  });

  it('should create', () => {
    expect(render(1)).toBeTruthy();
    expect(component).toBeTruthy();
  });

  // ── The full mapping. One case per result type the bilateral form supports. ──

  describe('types that paint their own form', () => {
    const CASES: { typeId: number; label: string; selector: (typeof ALL_FORMS)[number] }[] = [
      { typeId: 1, label: 'Policy Change', selector: 'app-type-policy-change' },
      { typeId: 2, label: 'Innovation Use', selector: 'app-type-innovation-use' },
      { typeId: 5, label: 'Capacity Sharing for Development', selector: 'app-type-capacity-sharing' },
      { typeId: 6, label: 'Knowledge Product', selector: 'app-type-knowledge-product' },
      { typeId: 7, label: 'Innovation Development', selector: 'app-type-innovation-dev' }
    ];

    CASES.forEach(({ typeId, label, selector }) => {
      it(`type ${typeId} (${label}) paints ${selector} and nothing else`, () => {
        const host = render(typeId);

        expect(component.hasNoTypeSpecific()).toBe(false);
        expect(component.typeLabel()).toBe(label);
        // Exactly one form, and it is the right one: a swapped @case would fail here.
        expect(paintedForms(host)).toEqual([selector]);
        expect(host.querySelector('.sts-empty')).toBeNull();
        expect(host.querySelector('.sts-type-badge')?.textContent).toContain(label);
      });
    });

    it('covers every form the component imports — no type is left unreachable', () => {
      const reachable = CASES.map(c => c.selector).sort();
      expect(reachable).toEqual([...ALL_FORMS].sort());
    });
  });

  describe('types with no type-specific section', () => {
    const CASES: { typeId: number; label: string }[] = [
      { typeId: 4, label: 'Other Outcome' },
      { typeId: 8, label: 'Other Output' },
      // 9 has no entry in TYPE_LABELS on purpose — it still must not paint a form.
      { typeId: 9, label: 'Unknown' }
    ];

    CASES.forEach(({ typeId, label }) => {
      it(`type ${typeId} (${label}) paints the empty state and no form`, () => {
        const host = render(typeId);

        expect(component.hasNoTypeSpecific()).toBe(true);
        expect(component.typeLabel()).toBe(label);
        expect(paintedForms(host)).toEqual([]);
        expect(host.querySelector('.sts-type-badge')).toBeNull();

        const empty = host.querySelector('.sts-empty');
        expect(empty).not.toBeNull();
        expect(empty?.textContent).toContain('No type-specific fields required');
        expect(empty?.textContent).toContain(label);
      });
    });
  });

  describe('unmapped / missing result type', () => {
    it('does not treat a null type as "no type-specific" — it just paints no form', () => {
      const host = render(null);

      // ⚠️ `?? 0` in the component means null falls through to the badge branch, NOT to the
      // empty state. Pinned so a future `NO_TYPE_SPECIFIC.has(0)` change is a deliberate one.
      expect(component.hasNoTypeSpecific()).toBe(false);
      expect(component.typeLabel()).toBe('Unknown');
      expect(paintedForms(host)).toEqual([]);
      expect(host.querySelector('.sts-empty')).toBeNull();
      expect(host.querySelector('.sts-type-badge')?.textContent).toContain('Unknown');
    });

    it('paints no form for a type that is neither mapped nor exempt (3)', () => {
      const host = render(3);

      expect(component.hasNoTypeSpecific()).toBe(false);
      expect(component.typeLabel()).toBe('Unknown');
      expect(paintedForms(host)).toEqual([]);
    });
  });

  it('re-paints when the open result changes type', () => {
    const host = render(1);
    expect(paintedForms(host)).toEqual(['app-type-policy-change']);

    creation.resultTypeId.set(7);
    fixture.detectChanges();
    expect(paintedForms(host)).toEqual(['app-type-innovation-dev']);
    expect(component.typeLabel()).toBe('Innovation Development');

    creation.resultTypeId.set(4);
    fixture.detectChanges();
    expect(paintedForms(host)).toEqual([]);
    expect(host.querySelector('.sts-empty')).not.toBeNull();
  });
});

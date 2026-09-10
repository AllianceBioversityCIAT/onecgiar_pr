import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomFieldsModule } from '../../../../../custom-fields/custom-fields.module';
import { FeedbackValidationDirectiveModule } from '../../../../directives/feedback-validation-directive.module';

/**
 * The three "Investment (USD)" tables, shared by the W1/W2 Innovation Use form and — since P2-3390 —
 * by the bilateral full metadata of Innovation Use and Innovation Development.
 *
 * Standalone so the bilateral sections (standalone components that do NOT import
 * `InnovationUseFormModule`) can import this class alone, without pulling in
 * `InnovationUseFormComponent` and `StudiesLinkComponent` with it. `InnovationUseFormModule` still
 * exports it, so the W1/W2 templates are unchanged.
 *
 * It renders one row per entity the server sends and owns no catalogue and no add/remove button: the
 * rows come from the result's own links, and the person only types an amount or ticks "yet to be
 * determined". Those two are mutually exclusive, which is what `onRadioChange` / `onInputChange`
 * enforce on the object the parent holds.
 */
@Component({
    selector: 'app-estimates-cgiar',
    templateUrl: './estimates.component.html',
    styleUrls: ['./estimates.component.scss'],
    imports: [CommonModule, FormsModule, CustomFieldsModule, FeedbackValidationDirectiveModule]
})
export class EstimatesCgiarComponent {
    @Input() body: any = {};
    @Input() disabled: boolean = false;
    /** Defaults preserve the W1/W2 form: all three optional investment tables. */
    @Input() sections: Array<'programs' | 'bilateral' | 'partners'> = ['programs', 'bilateral', 'partners'];
    /** P2-3428 uses only the W3/bilateral-project table as an MDS. */
    @Input() requiredSections: Array<'programs' | 'bilateral' | 'partners'> = [];
    @Output() changed = new EventEmitter<void>();

    shows(section: 'programs' | 'bilateral' | 'partners'): boolean {
        return this.sections.includes(section);
    }

    isRequired(section: 'programs' | 'bilateral' | 'partners'): boolean {
        return this.requiredSections.includes(section);
    }

    headerDescriptions() {
        const n1 = `<ul>
    <li>Innovation use team estimates the total investment (in-cash + in-kind) in innovation use made by the leading Science Program/Accelerator and the contributing Science Program/Accelerator during the reporting period.</li>
    <li>Includes Science Program/Accelerator funds allocated to CGIAR and/or partners.</li>
    <li>Innovation use team works with contributing Science Program/Accelerator to estimate the total (co-) investment (in-cash + in-kind) in innovation use made by each of the contributing Science Program/Accelerator during the reporting period</li>
    </ul>`;
        const n2 = `<ul>
    <li>Innovation use team works with W3/ bilateral projects to estimate the total (co-) investment (in-cash + in-kind) in innovation development made by each of the contributing W3/ Bilaterals during the reporting period</li>
    <li>Includes W3/ Bilateral funds allocated to CGIAR and/or partners</li>
    </ul>`;
        const n3 = `<ul>
    <li>Innovation use team works with partnersprojects to estimate the total (co-) investment (in-cash + in-kind) in innovation development made by each partner during the reporting period</li>
    <li>This concerns the investment of partner resources (in-cash and/or in-kind) that were not provided by CGIAR Science Program/Accelerator or projects</li>
    </ul>`;

        return { n1, n2, n3 };
    }

    checkValueAlert(item) {
        if (item.is_determined) {
            return true;
        }

        if (item.kind_cash) {
            return true;
        }

        return false;
    }

    onRadioChange(item: any) {
        if (item.is_determined) {
            item.kind_cash = null;
        }
        this.changed.emit();
    }

    onInputChange(item: any) {
        if (item.kind_cash) {
            item.is_determined = null;
        }
        this.changed.emit();
    }
}

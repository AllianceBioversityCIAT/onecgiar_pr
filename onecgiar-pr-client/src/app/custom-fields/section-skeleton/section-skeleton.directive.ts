import { Directive, Input } from '@angular/core';

/**
 * Marks a Result Detail section as "still loading its data".
 *
 * Why a directive that masks the REAL DOM instead of an `@if` + hand-drawn placeholder:
 *
 * 1. The mandatory-field feedback loop reads the DOM. `ResultDetailComponent.ngDoCheck` calls
 *    `DataControlService.someMandatoryFieldIncompleteResultDetail('.section_container')`, which
 *    scans for `.pr-input.mandatory .input-validation` and `.pr-field.mandatory:not(.complete)`.
 *    Destroying the controls while the GET is in flight would empty that scan and silently flip
 *    the alert count — a validation change, which is forbidden. Painting OVER the controls keeps
 *    every node (and every ngModel binding) exactly where it is.
 *
 * 2. Which fields are visible is already solved by `FieldsManagerService` (`hide` per `fieldRef`)
 *    plus the template `@if`s. Masking the live DOM therefore produces a skeleton whose shape is
 *    the shape of the fields that will actually render — for free, per portfolio and per
 *    validation, with no per-section drawing to keep in sync.
 *
 * `inert` + `pointer-events: none` replace the interaction lock that the old dark
 * "Loading section..." veil provided: without them the user could type into a field that the
 * in-flight response is about to overwrite.
 *
 * The visual mask lives in `src/app/custom-fields/section-skeleton/section-skeleton.scss`
 * (a global stylesheet: it has to reach projected/legacy descendant DOM).
 */
@Directive({
  selector: '[appSectionSkeleton]',
  standalone: false,
  host: {
    '[class.rd-loading]': 'appSectionSkeleton',
    '[attr.aria-busy]': 'appSectionSkeleton ? "true" : null',
    // Screen readers still reach the masked text, so aria-busy is the real mitigation;
    // inert only stops focus and pointer interaction.
    '[attr.inert]': 'appSectionSkeleton ? "" : null'
  }
})
export class SectionSkeletonDirective {
  @Input() appSectionSkeleton = false;
}

import { Directive, ElementRef, Input, OnChanges, OnInit, Renderer2, SimpleChanges, inject } from '@angular/core';
import { DataControlService } from '../services/data-control.service';

@Directive({
  selector: '[appFeedbackValidation]',
  standalone: false
})
export class FeedbackValidationDirective implements OnInit, OnChanges {
  @Input() labelText: string = '';
  @Input() isComplete: boolean = false;
  fieldDiv: HTMLDivElement | null = null;

  private readonly dataControlSE = inject(DataControlService);

  constructor(
    private readonly el: ElementRef,
    private readonly renderer: Renderer2
  ) {}

  ngOnInit(): void {
    const labelDiv = this.renderer.createElement('div');
    this.renderer.addClass(labelDiv, 'pr_label');
    labelDiv.textContent = this.labelText;

    this.fieldDiv = this.renderer.createElement('div');
    this.renderer.addClass(this.fieldDiv, 'pr-field');
    this.renderer.addClass(this.fieldDiv, 'mandatory');

    if (this.isComplete) this.renderer.addClass(this.fieldDiv, 'complete');

    this.renderer.appendChild(this.el.nativeElement, labelDiv);
    this.renderer.appendChild(this.el.nativeElement, this.fieldDiv);
    this.renderer.setStyle(this.el.nativeElement, 'display', 'none');

    this.dataControlSE.bumpMandatoryCheck();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.fieldDiv && changes['isComplete']) {
      this.isComplete
        ? this.renderer.addClass(this.fieldDiv, 'complete')
        : this.renderer.removeClass(this.fieldDiv, 'complete');
      this.dataControlSE.bumpMandatoryCheck();
    }
  }
}

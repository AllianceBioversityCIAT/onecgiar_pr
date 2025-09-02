import { Directive, Input, ElementRef, Renderer2, DoCheck, OnInit } from '@angular/core';

@Directive({
    selector: '[appFeedbackValidation]',
    standalone: false
})
export class FeedbackValidationDirective implements OnInit, DoCheck {
  @Input() labelText: string = '';
  @Input() isComplete: boolean = false;
  fieldDiv = null;
  constructor(private el: ElementRef, private renderer: Renderer2) {}
  ngOnInit() {
    const labelDiv = this.renderer.createElement('div');
    this.renderer.addClass(labelDiv, 'pr_label');
    labelDiv.textContent = this.labelText;

    this.fieldDiv = this.renderer.createElement('div');
    this.renderer.addClass(this.fieldDiv, 'pr-field');
    this.renderer.addClass(this.fieldDiv, 'mandatory');

    this.isComplete ? this.renderer.addClass(this.fieldDiv, 'complete') : null;

    this.renderer.appendChild(this.el.nativeElement, labelDiv);
    this.renderer.appendChild(this.el.nativeElement, this.fieldDiv);
    this.renderer.setStyle(this.el.nativeElement, 'display', 'none');
  }
  ngDoCheck(): void {
    this.isComplete ? this.renderer.addClass(this.fieldDiv, 'complete') : this.renderer.removeClass(this.fieldDiv, 'complete');
  }
}

import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-pr-word-counter',
    templateUrl: './pr-word-counter.component.html',
    styleUrls: ['./pr-word-counter.component.scss'],
    standalone: false
})
export class PrWordCounterComponent {
  @Input() wordCount: number;
  @Input() maxWords: number;
  @Input() autogenerate: boolean;
}

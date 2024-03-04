import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-pr-word-counter',
  standalone: true,
  templateUrl: './pr-word-counter.component.html',
  styleUrls: ['./pr-word-counter.component.scss'],
  imports: [CommonModule]
})
export class PrWordCounterComponent {
  @Input() wordCount: number;
  @Input() maxWords: number;
  @Input() autogenerate: boolean;
}

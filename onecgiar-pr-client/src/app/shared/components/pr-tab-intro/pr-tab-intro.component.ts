import { CommonModule } from '@angular/common';
import { Component, input, signal, OnInit } from '@angular/core';

@Component({
  selector: 'app-pr-tab-intro',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pr-tab-intro.component.html',
  styleUrls: ['./pr-tab-intro.component.scss']
})
export class PrTabIntroComponent implements OnInit {
  readonly title = input<string>('What does this tab show?');
  readonly description = input<string>('');
  readonly icon = input<string>('info');
  readonly defaultOpen = input<boolean>(true);

  readonly isOpen = signal<boolean>(true);

  ngOnInit(): void {
    this.isOpen.set(this.defaultOpen());
  }

  toggle(): void {
    this.isOpen.update(open => !open);
  }
}

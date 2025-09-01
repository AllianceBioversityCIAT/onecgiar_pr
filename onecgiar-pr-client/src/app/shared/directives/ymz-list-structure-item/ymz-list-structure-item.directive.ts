import { Directive, Output, EventEmitter, ElementRef, HostListener, OnInit } from '@angular/core';
import { RolesService } from '../../services/global/roles.service';

@Directive({
    selector: '[appYmzListStructureItem]',
    standalone: false
})
export class YmzListStructureItemDirective implements OnInit {
  @Output() deleteEvent = new EventEmitter();
  constructor(private el: ElementRef, private rolesSE: RolesService) {
    el.nativeElement.classList.add('ymz-list-structure-item');
  }
  @HostListener('click', ['$event']) onClick(event) {
    if (event.target.classList.contains('clickEvent')) {
      this.deleteEvent.emit();
    }
  }

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    const div = document.createElement('div');

    if (!this.rolesSE.readOnly) {
      div.classList.add('clickEvent', 'deleteItem');
      const icon = document.createElement('i');
      icon.classList.add('clickEvent', 'material-icons-round', 'ymz-lsi-delete-icon');
      icon.innerText = 'delete';
      div.appendChild(icon);
    }
    const line = document.createElement('div');
    line.classList.add('line');
    this.el.nativeElement.appendChild(line);
    if (!this.rolesSE.readOnly) this.el.nativeElement.appendChild(div);
  }
}

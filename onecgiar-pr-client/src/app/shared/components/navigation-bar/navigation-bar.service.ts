import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NavigationBarService {
  navbar_fixed = false;
  constructor() { }

  ngOnInit(): void {
    console.log(" ngOnInit scroll");


  }

}

import { Component, OnInit } from '@angular/core';
import { NavigationBarService } from './navigation-bar.service';

@Component({
  selector: 'app-navigation-bar',
  templateUrl: './navigation-bar.component.html',
  styleUrls: ['./navigation-bar.component.scss']
})
export class NavigationBarComponent implements OnInit {
  constructor(public _navigationBarService:NavigationBarService) { }

  ngOnInit(): void {
    window.addEventListener('scroll', (e)=> {
      console.log("scroll");
      // console.log(e);
      let scrollTopValue:any = window.pageYOffset || ((document.documentElement || document.body.parentNode || document.body)as any).scrollTop;
      console.log(scrollTopValue);
      if (scrollTopValue > 70) {
        this._navigationBarService.navbar_fixed = true;
      }else{
        this._navigationBarService.navbar_fixed = false;
      }
      // console.log(document.getElementById('sdsdsdsd')?.getBoundingClientRect().top);
    })
  }

}

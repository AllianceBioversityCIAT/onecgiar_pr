import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-navigation-bar',
  templateUrl: './navigation-bar.component.html',
  styleUrls: ['./navigation-bar.component.scss']
})
export class NavigationBarComponent implements OnInit {
  navbar_fixed = false;
  constructor() { }

  ngOnInit(): void {
    window.addEventListener('scroll', (e)=> {
      // console.log(e);
      let scrollTopValue = window.pageYOffset || (document.documentElement || document.body.parentNode || document.body).scrollTop;
      console.log(scrollTopValue);
      if (scrollTopValue > 70) {
        this.navbar_fixed = true;
      }else{
        this.navbar_fixed = false;
      }
      // console.log(document.getElementById('sdsdsdsd')?.getBoundingClientRect().top);
    })
  }

}

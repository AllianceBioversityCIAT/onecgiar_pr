import { Component, OnInit } from '@angular/core';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-google-analytics',
  templateUrl: './google-analytics.component.html',
  styleUrls: ['./google-analytics.component.scss']
})
export class GoogleAnalyticsComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {
    try {
      const script = document.createElement('script');
      script.src = `https://www.googletagmanager.com/gtag/js?id=${environment.googleAnalyticsId}`;
      document.getElementsByTagName('head')[0].appendChild(script);

      const script2 = document.createElement('script');
      script2.type = 'text/javascript';
      script2.text = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', '${environment.googleAnalyticsId}');
      `;
      document.getElementsByTagName('head')[0].appendChild(script2);
    } catch (error) {
      console.error(error);
    }
  }
}

import { DOCUMENT } from '@angular/common';
import { Component, Inject, Input, OnInit, Renderer2 } from '@angular/core';
import { ApiService } from '../../services/api/api.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-tawk',
  templateUrl: './tawk.component.html',
  styleUrls: ['./tawk.component.scss'],
  standalone: true
})
export class TawkComponent implements OnInit {
  @Input() id: string;
  @Input() user;
  username: string;
  email: string;

  script = this._renderer.createElement('script');

  constructor(
    private readonly _renderer: Renderer2,
    @Inject(DOCUMENT) private _document,
    public api: ApiService
  ) {}

  ngOnInit(): void {
    this.initializeTawkIo();
  }

  initializeTawkIo() {
    if (this.user != undefined) {
      this.script.text = `

      var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
      Tawk_API.customStyle = {
        visibility: {
          desktop: { position: 'br', xOffset: 24, yOffset: 130 },
          mobile: { position: 'br', xOffset: 24, yOffset: 130 }
        }
      };
      // Ensure the widget is hidden before it begins to load to prevent any bubble flash
      Tawk_API.onBeforeLoad = function () {
        if (typeof Tawk_API.hideWidget === 'function') Tawk_API.hideWidget();
      };

      // On load: if there is an active chat ongoing, keep it accessible; otherwise ensure the launcher stays hidden
      Tawk_API.onLoad = function () {
        if (typeof Tawk_API.isChatOngoing === 'function' && Tawk_API.isChatOngoing()) {
          if (typeof Tawk_API.showWidget === 'function') Tawk_API.showWidget();
        } else {
          if (typeof Tawk_API.hideWidget === 'function') Tawk_API.hideWidget();
        }
      };

      // On minimise: if a chat is active, keep the launcher accessible so the user can re-access it;
      // otherwise hide the launcher
      Tawk_API.onChatMinimized = function () {
        if (typeof Tawk_API.isChatOngoing === 'function' && Tawk_API.isChatOngoing()) {
          // Keep accessible while chat is active
        } else {
          if (typeof Tawk_API.hideWidget === 'function') Tawk_API.hideWidget();
        }
      };

      // Once the chat ends, the icon is hidden immediately
      Tawk_API.onChatEnded = function () {
        if (typeof Tawk_API.hideWidget === 'function') Tawk_API.hideWidget();
      };
      (function(){
      var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
      s1.async=true;
      s1.src="https://embed.tawk.to/${environment.tawkId}";
      s1.charset="UTF-8";
      s1.setAttribute("crossorigin","*");
      s0.parentNode.insertBefore(s1,s0);
      })();

      `;
      this._renderer.appendChild(document.querySelector('.Tawk_API_container'), this.script);

      this.api.setTWKAttributes();
    }
  }
}

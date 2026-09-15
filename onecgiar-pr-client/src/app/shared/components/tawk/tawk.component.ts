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
      // P2-3683: no floating bubble in the corner any more — the only way into the chat is the
      // topbar's Support menu (SupportChatService.open()). The bubble is hidden as soon as the
      // embed loads, and again whenever the user minimises the conversation, because Tawk brings
      // its launcher back on minimise and it would reappear in the corner.
      Tawk_API.onLoad = function () { if (Tawk_API.hideWidget) Tawk_API.hideWidget(); };
      Tawk_API.onChatMinimized = function () { if (Tawk_API.hideWidget) Tawk_API.hideWidget(); };
      Tawk_API.onChatEnded = function () { if (Tawk_API.hideWidget) Tawk_API.hideWidget(); };
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

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PdfActionsComponent } from './pdf-actions.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { ToastModule } from 'primeng/toast';
import { PdfIconModule } from '../../../../../../shared/icon-components/pdf-icon/pdf-icon.module';

@NgModule({
  declarations: [PdfActionsComponent],
  exports: [PdfActionsComponent],
  imports: [CommonModule, PdfIconModule, ClipboardModule, ToastModule]
})
export class PdfActionsModule {}

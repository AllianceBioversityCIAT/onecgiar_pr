import { Injectable } from '@angular/core';
import { CreateComplementaryInnovationDto } from '../components/new-complementary-innovation/new-complementary-innovation.component';

@Injectable({
  providedIn: 'root'
})
export class ComplementaryInnovationService {
  dialogStatus = false;
  bodyNewComplementaryInnovation = new CreateComplementaryInnovationDto();
  complementaries = true;
  idInnovation: number;
  isEdit = false;

  resetAll() {
    this.bodyNewComplementaryInnovation = new CreateComplementaryInnovationDto();
    this.complementaries = true;
    this.idInnovation = null;
    this.dialogStatus = false;
    this.isEdit = false;
  }
}

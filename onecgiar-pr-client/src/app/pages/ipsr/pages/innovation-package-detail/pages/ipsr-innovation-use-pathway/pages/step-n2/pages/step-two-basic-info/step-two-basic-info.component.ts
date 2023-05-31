import { Component, OnInit } from '@angular/core';
import { IpsrDataControlService } from 'src/app/pages/ipsr/services/ipsr-data-control.service';
import { ApiService } from 'src/app/shared/services/api/api.service';
import { Route, Router } from '@angular/router';

@Component({
  selector: 'app-step-two-basic-info',
  templateUrl: './step-two-basic-info.component.html',
  styleUrls: ['./step-two-basic-info.component.scss']
})
export class StepTwoBasicInfoComponent implements OnInit {


  constructor(public api: ApiService,public ipsrDataControlSE: IpsrDataControlService, private router: Router) { }
  informartion:any[] = [];
  selectOne:any[] = [];
  selectTow:any[] = [];
  cols:any = [];
  update:boolean = false;
  allInformation = true;
  innovationCompletary :any = [];
  bodyStep2:innovationComplementary[] = [];
  init = false;
  ngOnInit(): void {
    this.api.isStepTwoTwo = true;
    this.api.isStepTwoOne = false;
    this.getInnovationComplementaries();
    this.getComplementaryTypes();
  }

  onSaveSection(){
    console.log(this.bodyStep2);
    this.api.resultsSE.PostStepTwoComentariesInnovation(this.bodyStep2).subscribe((resp) =>{

      
    })
  }

  convertCols() {
    let contador = 0;
    let auxCols = [];
    this.innovationCompletary.forEach(element => {
      if (contador < 3) {
        auxCols.push(element);
      } else {
        if (contador == 3) {
          this.cols.push(auxCols);
          auxCols = [];
        }

        auxCols.push(element);
      }

      contador++;
    });

    this.cols.push(auxCols);
    this.update = true;
  }

  goToStep() {
    return `<a class='open_route' href='/ipsr/detail/${this.ipsrDataControlSE.resultInnovationCode}/ipsr-innovation-use-pathway/step-2/complementary-innovation' target='_blank'> Go to step 2.1</a>`;
  }

  selectedOneLevel(category, i, levels){ 
    if(category.subCategories.length != 0){
    if(this.bodyStep2[i].complementary_innovation_enabler_types_one.includes(category['complementary_innovation_enabler_types_id'])){
       category.subCategories.forEach(element => {
        this.bodyStep2[i].complementary_innovation_enabler_types_two.push(element.complementary_innovation_enabler_types_id)
      });
    }else{
      category.subCategories.forEach(element => {
        let index = this.bodyStep2[i].complementary_innovation_enabler_types_two.findIndex(ele => ele == element.complementary_innovation_enabler_types_id);
        if(index != -1){
          this.bodyStep2[i].complementary_innovation_enabler_types_two.splice(index,1);
        }
      });
    }
   
    this.update = false;
          setTimeout(() => {
            this.update = true;
          }, 500);
  }

 

}
  selectedTwo(category, i){
    if(this.bodyStep2[i].complementary_innovation_enabler_types_one.includes(category['complementary_innovation_enabler_types_id']) == false){
      this.bodyStep2[i].complementary_innovation_enabler_types_one.push(category.complementary_innovation_enabler_types_id);
      this.update = false;
      setTimeout(() => {
        this.update = true;
      }, 50);
    }

  }


  async onSavePreviuosNext(descrip){
    this.api.resultsSE.PostStepTwoComentariesInnovationPrevius(this.bodyStep2,descrip).subscribe((resp) =>{
      //console.log(resp);
      if(this.api.isStepTwoTwo&& descrip == 'next'){
        this.router.navigate(['/ipsr/detail/'+this.ipsrDataControlSE.resultInnovationCode+'/ipsr-innovation-use-pathway/step-3']);
      }

      if (descrip == 'previous') {
        this.router.navigate(['/ipsr/detail/' + this.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-2/complementary-innovation']);
      }
    });
  }

  getInnovationComplementaries(){
    

    this.api.resultsSE.getStepTwoComentariesInnovationId().subscribe((resp)=>{
      
      this.informartion = resp['response']['results'];
      this.informartion.forEach((respe) => {
        let complementary_enablers_two = []
        let complementary_enablers_one = []
        if (respe['complementary_enablers_one'] != null) {
          complementary_enablers_one= respe['complementary_enablers_one'].split(';');
        }
        if (respe['complementary_enablers_two'] != null) {
          complementary_enablers_two= respe['complementary_enablers_two'].split(';');
        }
        
        let aux = new innovationComplementary()
        aux.result_by_innovation_package_id = respe.result_by_innovation_package_id;
        if (complementary_enablers_one.length != 0) {
          aux.complementary_innovation_enabler_types_one = complementary_enablers_one
        }if (complementary_enablers_two.length != 0) {
          aux.complementary_innovation_enabler_types_two = complementary_enablers_two
        }
        this.bodyStep2.push(aux);
        respe.open = true;
        this.informartion[0].open = false;
      })
      
    })
  }

  getComplementaryTypes(){
      this.api.resultsSE.getStepTwoComentariesInnovation().subscribe((resp) =>{
        this.innovationCompletary = resp['response']['comentaryPrincipals'];
        this.convertCols();
        this.init = true;
        
      })
  }

}

export class innovationComplementary{
  
    result_by_innovation_package_id: string;
    complementary_innovation_enabler_types_one:any[]= new Array();
    complementary_innovation_enabler_types_two:any[]= new Array();
}


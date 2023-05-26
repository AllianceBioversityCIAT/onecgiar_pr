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
  informartion:innovationComplementary[] = [];
  bodyStep22:innovationComplementary[] = [];
  cols:any = [];
  update:boolean = true;
  allInformation = true;
  innovationCompletary :any = [];
  ngOnInit(): void {
    this.api.isStepTwoTwo = true;
    this.api.isStepTwoOne = false;
    this.api.resultsSE.GETInnovationPathwayStepTwoInnovationSelect().subscribe((resp) => {
      this.informartion = resp['response'];
      console.log(this.informartion);
      
      if (this.informartion.length != 0) {
        this.informartion[0].open = false;
        this.informartion.map(async elem => {
        let aux: innovationComplementary = new innovationComplementary()
        aux.result_by_innovation_package_id = elem.result_by_innovation_package_id;
        this.bodyStep22.push(aux)
          await this.saveInInnovationPackages(elem.result_by_innovation_package_id, this.bodyStep22.length -1);
        })
        
      }
    });
    setTimeout(() => {
      this.api.resultsSE.getStepTwoComentariesInnovation().subscribe((resp) =>{
        this.update = false;
        this.innovationCompletary = resp['response']['comentaryPrincipals'];
        
        this.convertCols();
        this.update = true;
        
      })
    }, 2000);
      
  }

  saveInInnovationPackages(id, i){
    this.update = false;
    let iter:any
    this.api.resultsSE.getStepTwoComentariesInnovationId(id).subscribe((resp) =>{
      iter=  resp['response'];
      if(id == iter.result_by_innovation_package_id){
        iter.complementary_innovation_enabler_types_two.map(elem =>{
          delete elem['level'];
          this.bodyStep22[i].complementary_innovation_enabler_types_two.push(elem)
        })

        iter.complementary_innovation_enabler_types_one.map(elem =>{
          delete elem['level'];
          elem.subCategories.map((ele)=>{
            delete ele['level'];
          })
          elem.subCategories =  elem.subCategories.sort((item,subitem) => {
            if(item.complementary_innovation_enabler_types_id < subitem.complementary_innovation_enabler_types_id){
              return -1;
            }else if(item.complementary_innovation_enabler_types_id < subitem.complementary_innovation_enabler_types_id){
              return 1;
            }else{
              return 0
            }
          })
          this.bodyStep22[i].complementary_innovation_enabler_types_one.push(elem)
        })
          
      }
          console.log(this.bodyStep22);
          
          this.update = true;
    })
  }

  onSaveSection(){
    console.log(this.bodyStep22);
    this.api.resultsSE.PostStepTwoComentariesInnovation(this.bodyStep22).subscribe((resp) =>{
      console.log(resp);
      
    })
    
  }

  convertCols(){
    let contador = 0;
    let auxCols = [];
    this.innovationCompletary.forEach(element => {
      if(contador < 3){
        auxCols.push(element);
      }else{
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
    if (levels = 1) {
      if(category.subCategories.length != 0){
       
        
        let index = this.bodyStep22[i].complementary_innovation_enabler_types_one.findIndex(ele => ele.complementary_innovation_enabler_types_id == category.complementary_innovation_enabler_types_id);
        console.log(index);
        if(index != -1){
          this.bodyStep22[i].complementary_innovation_enabler_types_one[index] = category;
          this.bodyStep22[i].complementary_innovation_enabler_types_one = this.removeDuplicates(this.bodyStep22[i].complementary_innovation_enabler_types_one , "complementary_innovation_enabler_types_id");
          this.bodyStep22[i].complementary_innovation_enabler_types_two = this.bodyStep22[i].complementary_innovation_enabler_types_two.concat(category.subCategories);
          this.bodyStep22[i].complementary_innovation_enabler_types_two = this.removeDuplicates(this.bodyStep22[i].complementary_innovation_enabler_types_two, "complementary_innovation_enabler_types_id");
        }
        else{
          category.subCategories.forEach(element => {
            let aux = this.bodyStep22[i].complementary_innovation_enabler_types_two.findIndex(ele => ele.complementary_innovation_enabler_types_id == element.complementary_innovation_enabler_types_id);
            console.log(aux);
            if(aux != -1){
              this.bodyStep22[i].complementary_innovation_enabler_types_two.splice(aux,1);
            }
            
          });
          this.update = false;
          setTimeout(() => {
            this.update = true;
          }, 500);
        }
      }
    }

    console.log(this.bodyStep22[i]);
    
    
  }
  
  removeDuplicates(originalArray, prop) {
    var newArray = [];
    var lookupObject  = {};

    for(var i in originalArray) {
       lookupObject[originalArray[i][prop]] = originalArray[i];
    }

    for(i in lookupObject) {
        newArray.push(lookupObject[i]);
    }
     return newArray;
}

  selectedTwo(category, i){
    let index = this.bodyStep22[i].complementary_innovation_enabler_types_one.findIndex(ele => ele.complementary_innovation_enabler_types_id == category.complementary_innovation_enabler_types_id);
    if(index == -1){
      this.bodyStep22[i].complementary_innovation_enabler_types_one.push(category);
      this.update = false;
          setTimeout(() => {
            this.update = true;
          }, 50);
    }
    
    console.log(this.bodyStep22);
    
  }


  async onSavePreviuosNext(descrip){
    console.log(this.informartion);
    this.api.resultsSE.PostStepTwoComentariesInnovationPrevius(this.bodyStep22,descrip).subscribe((resp) =>{
      console.log(resp);
      if(this.api.isStepTwoTwo&& descrip == 'next'){
        this.router.navigate(['/ipsr/detail/'+this.ipsrDataControlSE.resultInnovationCode+'/ipsr-innovation-use-pathway/step-3']);
      }

      if (descrip == 'previous') {
        this.router.navigate(['/ipsr/detail/'+this.ipsrDataControlSE.resultInnovationCode+'/ipsr-innovation-use-pathway/step-2/complementary-innovation']);
      }
    })
  }
}

export class innovationComplementary{
  
    result_by_innovation_package_id: string;
    result_id: string;
    result_code: string;
    title: string;
    description: string;
    initiative_id: number;
    initiative_official_code: string;
    is_active: boolean;
    open:boolean = true;
    complementary_innovation_enabler_types_one:enablerTypes[]= new Array();
    complementary_innovation_enabler_types_two:enablerTypes[]= new Array();
}

class enablerTypes{

    complementary_innovation_enabler_types_id: string;
    group: string;
    type: string;
    subCategories: any[]
    
}
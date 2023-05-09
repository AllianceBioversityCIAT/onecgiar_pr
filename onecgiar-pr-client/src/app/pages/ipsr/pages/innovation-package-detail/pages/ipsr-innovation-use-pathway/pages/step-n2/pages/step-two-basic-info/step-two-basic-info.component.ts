import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/shared/services/api/api.service';

@Component({
  selector: 'app-step-two-basic-info',
  templateUrl: './step-two-basic-info.component.html',
  styleUrls: ['./step-two-basic-info.component.scss']
})
export class StepTwoBasicInfoComponent implements OnInit {

innovationCompletary :any = [];
  constructor(public api: ApiService,) { }

  ngOnInit(): void {
    this.api.resultsSE.GETinnovationpathwayStepTwo().subscribe((resp) =>{
        console.log(resp);
        this.innovationCompletary = resp['response'];
        this.innovationCompletary.map((inno: any) => {
          inno.full_name = `${inno?.result_code} ${inno?.title} ${inno?.initiative_official_code} ${inno?.initiative_official_code} ${inno?.lead_contact_person} yes no `;
          inno.result_code = Number(inno.result_code);
        });
      })
  }

  informartion:any = [    {
        group:"(Bio)physical enablers",
        type:"1",
        id:1,
        subElements:[{
            group:"Access to quality infrastructure",
            type:"",
            id:1,
            subElements:[{
                group:"Road / transport",
                type:"",
                id:1,
            },
            {
                group:"Energy / Power",
                type:"",
                id:1,
            },
            {
                group:"Irrigation",
                type:"",
                id:1,
            },
            {
                group:"Other",
                type:"",
                id:1,
            }]
        },
        {
            group:"Access to productive assets (e.g. labor)",
            type:"",
            id:1,
            subElements:[]
        },
        {
            group:"Agro-climatic conditions/ resilience",
            type:"",
            id:1,
            subElements:[]
        }
    ]
    },
    {
        group:"One",
        type:"1",
        id:1,
        subElements:[{
            group:"two",
            type:"",
            id:1,
            subElements:[{
                group:"tree",
                type:"",
                id:1,
            }]
        }]
    },
    {
        group:"One",
        type:"1",
        id:1,
        subElements:[{
            group:"two",
            type:"",
            id:1,
            subElements:[{
                group:"tree",
                type:"",
                id:1,
            }]
        }]
    }
]

}

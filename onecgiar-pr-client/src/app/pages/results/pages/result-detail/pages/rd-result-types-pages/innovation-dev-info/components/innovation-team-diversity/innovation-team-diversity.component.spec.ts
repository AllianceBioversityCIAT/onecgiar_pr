import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InnovationTeamDiversityComponent } from './innovation-team-diversity.component';
import { PrRadioButtonComponent } from '../../../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { PrFieldHeaderComponent } from '../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';

describe('InnovationTeamDiversityComponent', () => {
  let component: InnovationTeamDiversityComponent;
  let fixture: ComponentFixture<InnovationTeamDiversityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ 
        InnovationTeamDiversityComponent,
        PrRadioButtonComponent,
        PrFieldHeaderComponent,
      ],
      imports: [
        HttpClientTestingModule,
        FormsModule
      ],

    })
    .compileComponents();

    fixture = TestBed.createComponent(InnovationTeamDiversityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should have default values on initialization', () => {
    expect(component.body).toEqual(new InnovationDevInfoBody());
    expect(component.options).toBeUndefined();
    expect(component.example11).toBeNull();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { InnovationPackageCustomTableComponent } from './innovation-package-custom-table.component';
import { MenuModule } from 'primeng/menu';
import { TableModule } from 'primeng/table';

describe('InnovationPackageCustomTableComponent', () => {
  let component: InnovationPackageCustomTableComponent;
  let fixture: ComponentFixture<InnovationPackageCustomTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InnovationPackageCustomTableComponent],
      imports: [HttpClientTestingModule, TableModule, MenuModule]
    }).compileComponents();

    fixture = TestBed.createComponent(InnovationPackageCustomTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

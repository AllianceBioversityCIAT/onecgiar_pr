import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EoioHomeComponent } from './eoio-home.component';
import { CommonModule } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

describe('EoioHomeComponent', () => {
  let component: EoioHomeComponent;
  let fixture: ComponentFixture<EoioHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, EoioHomeComponent, HttpClientTestingModule, RouterTestingModule],
      declarations: []
    }).compileComponents();

    fixture = TestBed.createComponent(EoioHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('EoioHomeComponent', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should return true when achievedTarget is greater than or equal to expectedTarget', () => {
      const expectedTarget = 10;
      const achievedTarget = 15;
      expect(component.achievedStatus(expectedTarget, achievedTarget)).toBe(true);
    });

    it('should return false when achievedTarget is less than expectedTarget', () => {
      const expectedTarget = 10;
      const achievedTarget = 5;
      expect(component.achievedStatus(expectedTarget, achievedTarget)).toBe(false);
    });

    it('should return false when expectedTarget is null', () => {
      const expectedTarget = null;
      const achievedTarget = 10;
      expect(component.achievedStatus(expectedTarget, achievedTarget)).toBe(false);
    });

    it('should return false when achievedTarget is null', () => {
      const expectedTarget = 10;
      const achievedTarget = null;
      expect(component.achievedStatus(expectedTarget, achievedTarget)).toBe(false);
    });

    it('should return false when both expectedTarget and achievedTarget are null', () => {
      const expectedTarget = null;
      const achievedTarget = null;
      expect(component.achievedStatus(expectedTarget, achievedTarget)).toBe(false);
    });
  });
});

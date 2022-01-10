import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AngularMaterialTestingGroundComponent } from './angular-material-testing-ground.component';

describe('AngularMaterialTestingGroundComponent', () => {
  let component: AngularMaterialTestingGroundComponent;
  let fixture: ComponentFixture<AngularMaterialTestingGroundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AngularMaterialTestingGroundComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AngularMaterialTestingGroundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

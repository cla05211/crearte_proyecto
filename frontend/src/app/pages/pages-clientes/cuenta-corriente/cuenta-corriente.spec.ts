import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CuentaCorriente } from './cuenta-corriente';

describe('CuentaCorriente', () => {
  let component: CuentaCorriente;
  let fixture: ComponentFixture<CuentaCorriente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CuentaCorriente],
    }).compileComponents();

    fixture = TestBed.createComponent(CuentaCorriente);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

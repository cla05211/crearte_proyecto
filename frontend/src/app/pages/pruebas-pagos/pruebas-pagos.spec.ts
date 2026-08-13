import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PruebasPagos } from './pruebas-pagos';

describe('PruebasPagos', () => {
  let component: PruebasPagos;
  let fixture: ComponentFixture<PruebasPagos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PruebasPagos],
    }).compileComponents();

    fixture = TestBed.createComponent(PruebasPagos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

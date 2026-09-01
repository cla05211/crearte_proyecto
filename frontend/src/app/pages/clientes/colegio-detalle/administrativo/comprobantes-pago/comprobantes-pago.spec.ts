import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComprobantesPago } from './comprobantes-pago';

describe('ComprobantesPago', () => {
  let component: ComprobantesPago;
  let fixture: ComponentFixture<ComprobantesPago>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComprobantesPago],
    }).compileComponents();

    fixture = TestBed.createComponent(ComprobantesPago);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

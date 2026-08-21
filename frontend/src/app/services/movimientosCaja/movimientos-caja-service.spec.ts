import { TestBed } from '@angular/core/testing';

import { MovimientosCajaService } from './movimientos-caja-service';

describe('MovimientosCajaService', () => {
  let service: MovimientosCajaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MovimientosCajaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

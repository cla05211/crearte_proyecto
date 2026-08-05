import { TestBed } from '@angular/core/testing';

import { GestionPedidosService } from './gestion-pedidos-service';

describe('GestionPedidosService', () => {
  let service: GestionPedidosService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GestionPedidosService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

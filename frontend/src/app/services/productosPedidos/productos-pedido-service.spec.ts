import { TestBed } from '@angular/core/testing';

import { ProductosPedidoService } from './productos-pedido-service';

describe('ProductosPedidoService', () => {
  let service: ProductosPedidoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProductosPedidoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

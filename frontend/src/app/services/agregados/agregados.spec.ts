import { TestBed } from '@angular/core/testing';

import { Agregados } from './agregados';

describe('Agregados', () => {
  let service: Agregados;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Agregados);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

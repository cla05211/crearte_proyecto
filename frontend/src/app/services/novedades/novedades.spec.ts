import { TestBed } from '@angular/core/testing';

import { Novedades } from './novedades';

describe('Novedades', () => {
  let service: Novedades;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Novedades);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';

import { CuotasService } from './cuotas-service';

describe('CuotasService', () => {
  let service: CuotasService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CuotasService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

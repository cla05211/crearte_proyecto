import { TestBed } from '@angular/core/testing';

import { MuestasFisicas } from './muestas-fisicas';

describe('MuestasFisicas', () => {
  let service: MuestasFisicas;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MuestasFisicas);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

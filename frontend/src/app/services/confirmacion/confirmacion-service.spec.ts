import { TestBed } from '@angular/core/testing';

import { ConfirmacionService } from './confirmacion-service';

describe('ConfirmacionService', () => {
  let service: ConfirmacionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConfirmacionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

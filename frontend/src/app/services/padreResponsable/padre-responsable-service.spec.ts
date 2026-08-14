import { TestBed } from '@angular/core/testing';

import { PadreResponsableService } from './padre-responsable-service';

describe('PadreResponsableService', () => {
  let service: PadreResponsableService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PadreResponsableService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

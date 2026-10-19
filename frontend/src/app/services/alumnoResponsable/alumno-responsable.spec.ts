import { TestBed } from '@angular/core/testing';

import { AlumnoResponsable } from './alumno-responsable';

describe('AlumnoResponsable', () => {
  let service: AlumnoResponsable;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AlumnoResponsable);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

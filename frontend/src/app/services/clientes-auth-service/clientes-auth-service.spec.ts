import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ClientesAuthService } from './clientes-auth-service';

describe('ClientesAuthService', () => {
  let service: ClientesAuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ClientesAuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientesAuthService } from './clientes-auth-service';

describe('ClientesAuthService', () => {
  let component: ClientesAuthService;
  let fixture: ComponentFixture<ClientesAuthService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientesAuthService],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientesAuthService);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

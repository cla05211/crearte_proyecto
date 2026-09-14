import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginClientes } from './login-clientes';

describe('LoginClientes', () => {
  let component: LoginClientes;
  let fixture: ComponentFixture<LoginClientes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginClientes],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginClientes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

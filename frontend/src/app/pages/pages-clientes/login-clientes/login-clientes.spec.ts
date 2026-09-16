import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { LoginClientes } from './login-clientes';

describe('LoginClientes', () => {
  let component: LoginClientes;
  let fixture: ComponentFixture<LoginClientes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginClientes],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginClientes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { respuestaLoginCliente, Cliente } from './dto/respuestaLoginCliente';

@Injectable({
  providedIn: 'root',
})
export class ClientesAuthService
{
  http = inject(HttpClient);
  token?: string;
  cliente?: Cliente;

  constructor()
  {
    this.cargarClienteDesdeStorage();
  }

  login(usuario: string, contraseña: string)
  {
    return this.http
    .post<respuestaLoginCliente>(`${environment.apiUrl}/clientes-auth/login`, {
      usuario,
      contraseña
    })
    .pipe(
      tap(respuesta => {
        this.token = respuesta.token;
        this.cliente = respuesta.cliente;
        this.guardarSesion();
      })
    );
  }

  // Verifica el link de activación antes de mostrar el formulario. Devuelve el usuario del cliente.
  validarTokenActivacion(token: string)
  {
    return this.http.get<{ usuario: string }>(`${environment.apiUrl}/clientes-auth/activacion/${token}`);
  }

  crearContrasena(token: string, contraseña: string)
  {
    return this.http.post<{ usuario: string }>(`${environment.apiUrl}/clientes-auth/crear-contrasena`, {
      token,
      contraseña
    });
  }

  guardarSesion()
  {
    try
    {
      localStorage.setItem('cliente_token', this.token!);
      localStorage.setItem('cliente', JSON.stringify(this.cliente));
    }
    catch(err)
    {
      console.log(err);
    }
  }

  cerrarSesion()
  {
    this.cliente = undefined;
    this.token = undefined;
    localStorage.removeItem('cliente_token');
    localStorage.removeItem('cliente');
  }

  cargarClienteDesdeStorage(): Cliente|null
  {
    let clienteGuardado: Cliente|null = null
    try
    {
      const clienteString = localStorage.getItem('cliente');
      const token = localStorage.getItem('cliente_token');
      if (clienteString && token)
      {
        clienteGuardado = JSON.parse(clienteString);
        this.cliente = clienteGuardado!;
        this.token = token;
      }
    }
    catch(err)
    {
      console.log(err);
    }
    return clienteGuardado
  }
}

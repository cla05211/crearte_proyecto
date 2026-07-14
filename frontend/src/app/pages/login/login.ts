import { Component } from '@angular/core';
import{ FormsModule, FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule, SlicePipe } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../services/Auth/auth-service';
import Swal from 'sweetalert2';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login 
{
  verClave: boolean = false;
  auth = inject(AuthService)
  router = inject(Router)

  toggleClave(): void 
    {
    this.verClave = !this.verClave;
    }

    formularioLogin = new FormGroup
    ({
        correo: new FormControl('',[Validators.required,Validators.email]),
        contraseña: new FormControl('',[Validators.required, Validators.minLength(5),Validators.pattern('^[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+$')])
    })

    verficarCampo(controlName: string): string | null 
    {
        const control = this.formularioLogin.get(controlName);
        var mensaje = null;

        if (control?.touched) 
        {
          if (control.hasError('required')) {mensaje = 'Este campo es obligatorio.'};
          if (control.hasError('email')) {mensaje = 'Debe ser un correo válido.'};
          if (control.hasError('pattern')) {mensaje = 'Formato inválido.'};
          if (control.hasError('minlength')) {mensaje = 'El dato ingresado es muy corto.'};
        }
        return mensaje;
    }

    async iniciarSesion()
    {
        if (this.formularioLogin.invalid) 
        {
            this.formularioLogin.markAllAsTouched();
        }
        else
        {
            const correo = String(this.formularioLogin.get('correo')?.value);
            const contraseña = String(this.formularioLogin.get('contraseña')?.value);
            try
            {
                const data:any = await firstValueFrom (this.auth.login(correo,contraseña));
                this.auth.guardarSesion(data.session)
                this.router.navigate(['/home']);
            }
            catch (error)
            {
                if (error instanceof HttpErrorResponse) 
                {
                    console.log(error);
                    const mensaje = error.message.toLowerCase();
                    if (mensaje.includes('invalid login credentials')) 
                    {
                        Swal.fire({
                        icon: 'warning',
                        title: 'Usuario no registrado',
                        text: 'El correo ingresado no se encuentra registrado.',
                        confirmButtonText: 'Entendido',
                        });
                    }
                    else
                    {
                        Swal.fire({
                        icon: 'warning',
                        title: 'Error',
                        text: 'Lo sentimos, ha ocurrido un error inesperado.',
                        confirmButtonText: 'Entendido',
                        });
                    }
                }
            }
        }
    }
}

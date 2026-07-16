import { Component } from '@angular/core';
import{ FormsModule, FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule, SlicePipe } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../services/Auth/auth-service';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { NotificationService } from '../../shared/notifications/notification.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink, CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login 
{
  verClave: boolean = false;
  auth = inject(AuthService)
  router = inject(Router)
  notificaciones = inject(NotificationService)

  toggleClave(): void 
    {
    this.verClave = !this.verClave;
    }

    formularioLogin = new FormGroup
    ({
        correo: new FormControl('',[Validators.required,Validators.email]),
        contraseña: new FormControl('',[Validators.required, Validators.minLength(5),Validators.pattern('^[A-Za-z0-9Ññ]+$')])
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
                this.auth.guardarSesion();
                this.router.navigate(['/home']);
            }    
            catch (err: any) 
            {
                const code = err?.error?.code; //Este es el data.error del back

                if (code === 'INVALID_CREDENTIALS')
                {
                    this.notificaciones.warning({
                        title: 'Usuario no registrado',
                        description: 'El correo ingresado no se encuentra registrado o la contraseña es incorrecta.',
                    });
                }
                else if (code === 'PENDING_APPROVAL')
                {
                    this.notificaciones.warning({
                        title: 'Usuario pendiente de aprobación',
                        description: 'El correo ingresado se encuentra pendiente de aprobación.',
                    });
                }
                else
                {
                    this.notificaciones.warning({
                        title: 'Error',
                        description: 'Lo sentimos, ha ocurrido un error inesperado.',
                    });
                }
            }
        
        }
    }
}
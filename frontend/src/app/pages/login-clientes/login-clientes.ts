import { Component, inject } from '@angular/core';
import { FormsModule, FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ClientesAuthService } from '../../services/clientes-auth-service/clientes-auth-service';
import { NotificationService } from '../../shared/notifications/notification.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-login-clientes',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, FontAwesomeModule],
  templateUrl: './login-clientes.html',
  styleUrl: './login-clientes.css',
})
export class LoginClientes 
{
    faEye = faEye;
    faEyeSlash = faEyeSlash;
    verClave: boolean = false;
    auth = inject(ClientesAuthService)
    router = inject(Router)
    notificaciones = inject(NotificationService)

    toggleClave(): void 
    {
        this.verClave = !this.verClave;
    }

    formularioLogin = new FormGroup
    ({
        usuario: new FormControl('',[Validators.required]),
        contraseña: new FormControl('',[Validators.required, Validators.minLength(5),Validators.pattern('^[A-Za-z0-9Ññ]+$')])
    })

    verficarCampo(controlName: string): string | null 
    {
        const control = this.formularioLogin.get(controlName);
        var mensaje = null;

        if (control?.touched) 
        {
          if (control.hasError('required')) {mensaje = 'Este campo es obligatorio.'};
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
            const usuario = String(this.formularioLogin.get('usuario')?.value);
            const contraseña = String(this.formularioLogin.get('contraseña')?.value);
            try
            {
                await firstValueFrom(this.auth.login(usuario, contraseña));
                this.router.navigate(['/portal-cliente']);
            }    
            catch (err: any) 
            {
                const code = err?.error?.code; //Este es el data.error del back

                if (code === 'INVALID_CREDENTIALS')
                {
                    this.notificaciones.warning({
                        title: 'Datos incorrectos',
                        description: 'El usuario o la contraseña son incorrectos.',
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

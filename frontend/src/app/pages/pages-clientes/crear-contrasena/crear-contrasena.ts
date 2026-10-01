import { Component, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { ClientesAuthService } from '../../../services/clientes-auth-service/clientes-auth-service';
import { NotificationService } from '../../../shared/notifications/notification.service';

// 'cargando': validando el link | 'formulario': link válido | 'invalido' / 'vencido': no se puede usar
type EstadoPagina = 'cargando' | 'formulario' | 'invalido' | 'vencido';

// Las dos contraseñas tienen que coincidir.
const contrasenasIguales = (grupo: AbstractControl): ValidationErrors | null =>
{
    const contraseña = grupo.get('contraseña')?.value;
    const confirmacion = grupo.get('confirmacion')?.value;
    return contraseña && confirmacion && contraseña !== confirmacion ? { noCoinciden: true } : null;
};

@Component({
  selector: 'app-crear-contrasena',
  imports: [ReactiveFormsModule, FontAwesomeModule, RouterLink],
  templateUrl: './crear-contrasena.html',
  styleUrl: './crear-contrasena.css',
})
export class CrearContrasena implements OnInit
{
    faEye = faEye;
    faEyeSlash = faEyeSlash;

    auth = inject(ClientesAuthService);
    route = inject(ActivatedRoute);
    router = inject(Router);
    notificaciones = inject(NotificationService);

    // Signals: la app es zoneless, así los cambios que llegan del back se ven en pantalla.
    estado = signal<EstadoPagina>('cargando');
    usuario = signal('');
    guardando = signal(false);
    verClave = signal(false);

    private token = '';

    // Mismas reglas que el login de clientes (y que valida el back).
    formulario = new FormGroup({
        contraseña: new FormControl('', [Validators.required, Validators.minLength(8), Validators.pattern('^[A-Za-z0-9Ññ]+$')]),
        confirmacion: new FormControl('', [Validators.required]),
    }, { validators: contrasenasIguales });

    async ngOnInit()
    {
        this.token = this.route.snapshot.paramMap.get('token') ?? '';

        try
        {
            const respuesta = await firstValueFrom(this.auth.validarTokenActivacion(this.token));
            this.usuario.set(respuesta.usuario);
            this.estado.set('formulario');
        }
        catch (err: any)
        {
            this.estado.set(err?.error?.code === 'TOKEN_VENCIDO' ? 'vencido' : 'invalido');
        }
    }

    toggleClave(): void
    {
        this.verClave.update(valor => !valor);
    }

    verificarCampo(nombre: 'contraseña' | 'confirmacion'): string | null
    {
        const control = this.formulario.get(nombre);
        if (!control?.touched) return null;

        if (control.hasError('required')) return 'Este campo es obligatorio.';
        if (control.hasError('minlength')) return 'Debe tener al menos 8 caracteres.';
        if (control.hasError('pattern')) return 'Solo puede tener letras y números.';
        if (nombre === 'confirmacion' && this.formulario.hasError('noCoinciden')) return 'Las contraseñas no coinciden.';
        return null;
    }

    async crearContrasena()
    {
        if (this.formulario.invalid)
        {
            this.formulario.markAllAsTouched();
            return;
        }

        this.guardando.set(true);
        try
        {
            const contraseña = String(this.formulario.get('contraseña')?.value);
            const respuesta = await firstValueFrom(this.auth.crearContrasena(this.token, contraseña));

            this.notificaciones.success({
                title: 'Contraseña creada',
                description: 'Ya podés ingresar a la plataforma con tu usuario y tu nueva contraseña.',
            });
            this.router.navigate(['/login-clientes'], { queryParams: { usuario: respuesta.usuario } });
        }
        catch (err: any)
        {
            const code = err?.error?.code;

            if (code === 'TOKEN_VENCIDO' || code === 'TOKEN_INVALIDO')
            {
                this.estado.set(code === 'TOKEN_VENCIDO' ? 'vencido' : 'invalido');
            }
            else
            {
                this.notificaciones.warning({
                    title: 'Error',
                    description: err?.error?.message ?? 'Lo sentimos, ha ocurrido un error inesperado.',
                });
            }
        }
        finally
        {
            this.guardando.set(false);
        }
    }
}

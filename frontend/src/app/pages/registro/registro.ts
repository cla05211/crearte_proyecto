import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/Auth/auth-service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import{ FormsModule, FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms'
import { RegistroDto } from '../../services/Auth/dto/registro.interface';
import { RolDto } from '../../services/roles/dto/rol.dto';
import { RolService } from '../../services/roles/rol-service';

@Component({
  selector: 'app-registro',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './registro.html',
  styleUrl: './registro.css',
})
export class Registro {
    verClave: boolean = false;
    auth = inject(AuthService)
    router = inject(Router)
    rolService = inject(RolService);
    rolSeleccionado: number | null = null;
    roles: RolDto[] = [];

    async ngOnInit() {
        try 
        {
            this.roles = await firstValueFrom(this.rolService.obtenerRoles());
        } 
        catch (error) 
        {
            console.error(error);
        }
    }
  
  formularioRegistro = new FormGroup
    ({
        correo: new FormControl('',[Validators.required,Validators.email]),
        contraseña: new FormControl('',[Validators.required, Validators.minLength(6),Validators.pattern('^[A-Za-z0-9ÁÉÍÓÚáéíóúÑñÜü]+$')]),
        nombre: new FormControl('',[Validators.required, Validators.minLength(3),Validators.pattern('^[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+$')]),
        apellido: new FormControl('',[Validators.required, Validators.minLength(3),Validators.pattern('^[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+$')]),
        rol: new FormControl(null, Validators.required)
    })

    verficarCampo(controlName: string): string | null 
    {
        const control = this.formularioRegistro.get(controlName);
        var mensaje = null;

        if (control?.touched) 
        {
          if (control.hasError('required')) {mensaje = 'Este campo es obligatorio.'};
          if (control.hasError('email')) {mensaje = 'Debe ser un correo válido.'};
          if (control.hasError('minlength')) {mensaje = 'El dato ingresado es muy corto.'};
          if (control.hasError('maxlength')) {mensaje = 'El dato ingresado es muy largo.'};
        }
        return mensaje;
    }

    async registrar()
    {
        if (this.formularioRegistro.invalid) 
                {
                    this.formularioRegistro.markAllAsTouched();
                }
                else
                {
                    const dto: RegistroDto =
                    {
                        correo: String(this.formularioRegistro.get('correo')?.value),
                        contraseña: String(this.formularioRegistro.get('contraseña')?.value),
                        nombre: String(this.formularioRegistro.get('nombre')?.value),
                        apellido: String(this.formularioRegistro.get('apellido')?.value),
                        rol: Number(this.formularioRegistro.get('rol')?.value)
                    }

                    try
                    {
                        const data:any = await firstValueFrom (this.auth.registrar(dto));
                        const logindata:any = await firstValueFrom (this.auth.login(dto.correo,dto.contraseña));
                        this.auth.guardarSesion(logindata.data.session)
                        this.router.navigate(['/home']);
                    }
                    catch (error)
                    {
                        if (error instanceof HttpErrorResponse) 
                        {
                            console.log(error);
                            const mensaje = error.message.toLowerCase();
                            if (mensaje.includes('user already registered')) 
                            {
                                Swal.fire({
                                icon: 'warning',
                                title: 'Usuario no registrado',
                                text: 'Ya existe una cuenta con ese correo electrónico.',
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

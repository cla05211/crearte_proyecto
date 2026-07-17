import { Component } from '@angular/core';
import { AuthService } from '../../services/Auth/auth-service';
import { Inject, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-olvido-clave',
  imports: [],
  templateUrl: './olvido-clave.html',
  styleUrl: './olvido-clave.css',
})
export class OlvidoClave 
{
  auth = inject(AuthService);

  async resetearContraseña(correo:string)
  {
     const data:any = await firstValueFrom (this.auth.resetearContraseña(correo));
  }
}

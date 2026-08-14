import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PadreResponsableDTO } from '../gestionPedidos/dto/padreResponsable.dto';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class PadreResponsableService 
{
  http = inject(HttpClient);  

  traerPadreResponsableId(idGrupo: number): Observable<PadreResponsableDTO>
  {
    return this.http.get<PadreResponsableDTO>((`${environment.apiUrl}/padre-responsable/${idGrupo}`));
  }

}

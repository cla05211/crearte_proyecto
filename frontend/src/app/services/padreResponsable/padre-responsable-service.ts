import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PadreResponsableDTO } from './dto/padreResponsable.dto';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { PadreResponsableResponseDTO } from './dto/padreResponsableResponse.dto';

@Injectable({
  providedIn: 'root',
})
export class PadreResponsableService 
{
  http = inject(HttpClient);  

  traerPadreResponsableId(idGrupo: number): Observable<PadreResponsableResponseDTO>
  {
    return this.http.get<PadreResponsableResponseDTO>((`${environment.apiUrl}/padre-responsable/${idGrupo}`));
  }
}

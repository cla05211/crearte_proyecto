import { Injectable, signal } from '@angular/core';

// Estado compartido entre la página de Talles y sus pestañas (se provee en el componente Talles,
// así cada visita arranca de cero). null = todavía no se sabe si los talles están confirmados.
@Injectable()
export class TallesConfirmacionService
{
    readonly confirmados = signal<boolean | null>(null);
}

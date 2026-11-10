import { SetMetadata } from '@nestjs/common';

export const PERMISO_KEY = 'permiso';
// Acepta uno o más permisos: alcanza con tener cualquiera de ellos
export const RequierePermiso = (...permisos: string[]) => SetMetadata(PERMISO_KEY, permisos);
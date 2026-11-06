export class NovedadDTO
{
    idGrupo!:number;
    colegio!:string;
    fecha?: string;
    // Solo en modificaciones: qué se cambió ('Plan', 'Prendas', 'Agregados', 'Beneficios')
    cambios?: string[];
}
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Ventas } from './ventas';

describe('Ventas', () => {
  let component: Ventas;
  let fixture: ComponentFixture<Ventas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Ventas],
    }).compileComponents();

    fixture = TestBed.createComponent(Ventas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('etiquetaPlanCuotas', () => {
    beforeEach(() => {
      component.productosDisponibles.set([
        {
          id_producto: 1,
          cantidad_desde: 1,
          cantidad_hasta: 10,
          cuotas: 1,
          valor_senia: 100,
          valor_cuota: 100,
          beneficio: null,
          nombre: 'Producto A',
          descripcion: '',
        },
        {
          id_producto: 1,
          cantidad_desde: 1,
          cantidad_hasta: 10,
          cuotas: 3,
          valor_senia: 50,
          valor_cuota: 200,
          beneficio: null,
          nombre: 'Producto A',
          descripcion: '',
        },
      ] as any);
    });

    it('muestra cuotas + 1 cuando la seña vale lo mismo que la cuota', () => {
      expect(component.etiquetaPlanCuotas(1, 1, 5)).toBe('2 cuotas');
    });

    it('muestra "cuotas + Seña" cuando la seña vale distinto a la cuota', () => {
      expect(component.etiquetaPlanCuotas(3, 1, 5)).toBe('3 cuotas + Seña');
    });

    it('muestra el texto plano si no encuentra el precio para esa combinación', () => {
      expect(component.etiquetaPlanCuotas(6, 1, 5)).toBe('6 cuotas');
    });
  });
});

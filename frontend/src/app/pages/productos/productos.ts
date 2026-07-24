import { Component, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { ProductoDBDTO } from '../../services/productos/dto/productoDB.dto';
import { Inject, inject } from '@angular/core';
import { ProductosService } from '../../services/productos/productos-service';
import { AgregadoDBDTO } from '../../services/productos/dto/agregadoDB.dto';
import { ProductoPOSTDTO } from '../../services/productos/dto/productoPOST.dto';
import { AgregadoPOSTDTO } from '../../services/productos/dto/agregadoPOST.dto';

@Component({
  selector: 'app-productos',
  imports: [JsonPipe],
  templateUrl: './productos.html',
  styleUrl: './productos.css',
})
export class Productos 
{
    productosService = inject(ProductosService);
    productos = signal<ProductoDBDTO[]>([]);
    agregados = signal<AgregadoDBDTO[]>([]);
    cargando = signal(false);

    ngOnInit(): void
    {
    this.cargarProductos()
    }

    cargarProductos():void
    {
        this.cargando.set(true);
        this.productosService.obtenerProductos().subscribe(
        {
            next: (productos) => {this.productos.set(productos);}
        })
        this.productosService.obtenerAgregados().subscribe(
        {
            next: (agregados) => {this.agregados.set(agregados);
            this.cargando.set(false);},
        })
    }

    agregarProducto(producto: ProductoPOSTDTO)
    {
        this.productosService.agregarProducto(producto).subscribe({
        next: (productoAgregado) => 
        {
            this.productos.update(productos => [
            ...productos,
            productoAgregado
            ]);
        },
        error: (err) => 
        {
            console.error(err);
        }
        });
    }

    agregarAgregado(agregado: AgregadoPOSTDTO)
    {
        this.productosService.agregarAgregado(agregado).subscribe({
        next: (agregadoNuevo) => 
        {
            this.agregados.update(agregados => [
            ...agregados,
            agregadoNuevo
            ]);
        },
        error: (err) => 
        {
            console.error(err);
        }
        });
    }

    eliminarProducto(idProducto: number)
    {
        this.productosService.eliminarProducto(idProducto).subscribe({
        next: () => 
        {
            this.productos.update(productos => 
                productos.filter(p => p.id != idProducto)
            );
        },
        error: (err) => 
        {
            console.error(err);
        }
        });        
    }

    eliminarAgregado(idAgregado:number)
    {
        this.productosService.eliminarAgregado(idAgregado).subscribe({
        next: () => 
        {
            this.agregados.update(agregados => 
                agregados.filter(a => a.id != idAgregado)
            );
        },
        error: (err) => 
        {
            console.error(err);
        }
        }); 
    }
}

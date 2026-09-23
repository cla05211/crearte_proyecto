import { Component, viewChild, ElementRef, afterNextRender, input, inject, output } from '@angular/core';
import SignaturePad from 'signature_pad';
import { StorageService } from '../services/storage/storage-service';
import { SubirArchivoStorage } from '../services/storage/dtos/SubirArchivoStorage';

@Component({
    selector: 'app-firma',
    standalone: true,
    templateUrl: './firma.html',
    styleUrl: './firma.css',
})

export class FirmaComponent 
{
	ancho = input(400);
  	alto = input(200);

	// Avisa al padre cada vez que se termina un trazo (por ej. para limpiar un aviso de "falta la firma")
	trazo = output<void>();

	private storageService = inject(StorageService);
	canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvasFirma');
	private pad?: SignaturePad;

	constructor() 
	{
		//afterNextRender, carga primero los componentes angular
		afterNextRender(() => {
		const canvas = this.canvasRef().nativeElement;
		this.resizeCanvas(canvas);
		this.pad = new SignaturePad(canvas, { minWidth: 0.5, maxWidth: 2.5 });
		this.pad.addEventListener('endStroke', () => this.trazo.emit());
		});
	}

	private resizeCanvas(canvas: HTMLCanvasElement) 
	{
		const ratio = Math.max(window.devicePixelRatio || 1, 1);
		canvas.width = canvas.offsetWidth * ratio;
		canvas.height = canvas.offsetHeight * ratio;
		canvas.getContext('2d')?.scale(ratio, ratio);
	}

	limpiar() 
	{
		this.pad?.clear();
	}

	estaVacia(): boolean
	{
		return !this.pad || this.pad.isEmpty();
	}

	// Devuelve la firma como PNG sin subirla, para que el componente que la usa decida a dónde mandarla
	async obtenerImagen(): Promise<Blob | null>
	{
		if (!this.pad || this.pad.isEmpty()) return null;

		const dataUrl = this.pad.toDataURL('image/png');
		return await (await fetch(dataUrl)).blob();
	}

	async guardar(nombreArchivo:string, carpetaGuardado:string): Promise<Blob | void>
	{
		if (!this.pad || this.pad.isEmpty()) return;

		const dataUrl = this.pad.toDataURL('image/png');
		const blob = await (await fetch(dataUrl)).blob();
		const archivo = new File([blob], `${nombreArchivo}.png`, { type: 'image/png' });
		const archivoDto: SubirArchivoStorage = {archivo, nombreArchivo, carpetaGuardado}

		  this.storageService.subirImagen(archivoDto)
			.subscribe({
			next: (res) => console.log('firma guardada en', res.ruta),
			error: (err) => console.error('error subiendo firma', err),
			});
	}
}
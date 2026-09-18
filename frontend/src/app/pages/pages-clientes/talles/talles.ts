import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-talles',
  imports: [RouterLink, RouterOutlet],
  templateUrl: './talles.html',
  styleUrl: './talles.css',
})
export class Talles 
{
    private readonly route = inject(ActivatedRoute);
}

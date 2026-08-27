import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ColegioDetalle } from './colegio-detalle';

describe('ColegioDetalle', () => {
  let component: ColegioDetalle;
  let fixture: ComponentFixture<ColegioDetalle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColegioDetalle],
    }).compileComponents();

    fixture = TestBed.createComponent(ColegioDetalle);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

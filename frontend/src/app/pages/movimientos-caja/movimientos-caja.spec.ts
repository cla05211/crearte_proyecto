import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MovimientosCaja } from './movimientos-caja';

describe('MovimientosCaja', () => {
  let component: MovimientosCaja;
  let fixture: ComponentFixture<MovimientosCaja>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MovimientosCaja],
    }).compileComponents();

    fixture = TestBed.createComponent(MovimientosCaja);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

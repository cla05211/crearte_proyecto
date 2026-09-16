import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Presupuesto } from './presupuesto';

describe('Presupuesto', () => {
  let component: Presupuesto;
  let fixture: ComponentFixture<Presupuesto>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Presupuesto],
    }).compileComponents();

    fixture = TestBed.createComponent(Presupuesto);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

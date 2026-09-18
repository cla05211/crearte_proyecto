import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Carga } from './carga';

describe('Carga', () => {
  let component: Carga;
  let fixture: ComponentFixture<Carga>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Carga],
    }).compileComponents();

    fixture = TestBed.createComponent(Carga);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

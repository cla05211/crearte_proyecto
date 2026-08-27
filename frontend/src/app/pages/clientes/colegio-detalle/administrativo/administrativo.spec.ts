import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Administrativo } from './administrativo';

describe('Administrativo', () => {
  let component: Administrativo;
  let fixture: ComponentFixture<Administrativo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Administrativo],
    }).compileComponents();

    fixture = TestBed.createComponent(Administrativo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

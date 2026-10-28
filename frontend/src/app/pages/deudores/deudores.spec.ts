import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Deudores } from './deudores';

describe('Deudores', () => {
  let component: Deudores;
  let fixture: ComponentFixture<Deudores>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Deudores],
    }).compileComponents();

    fixture = TestBed.createComponent(Deudores);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

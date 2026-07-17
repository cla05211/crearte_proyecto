import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResetearClave } from './resetear-clave';

describe('ResetearClave', () => {
  let component: ResetearClave;
  let fixture: ComponentFixture<ResetearClave>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResetearClave],
    }).compileComponents();

    fixture = TestBed.createComponent(ResetearClave);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

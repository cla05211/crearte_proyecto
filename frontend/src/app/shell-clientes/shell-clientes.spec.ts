import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShellClientes } from './shell-clientes';

describe('ShellClientes', () => {
  let component: ShellClientes;
  let fixture: ComponentFixture<ShellClientes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShellClientes],
    }).compileComponents();

    fixture = TestBed.createComponent(ShellClientes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

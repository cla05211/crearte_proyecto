import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PortalCliente } from './portal-cliente';

describe('PortalCliente', () => {
  let component: PortalCliente;
  let fixture: ComponentFixture<PortalCliente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortalCliente],
    }).compileComponents();

    fixture = TestBed.createComponent(PortalCliente);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

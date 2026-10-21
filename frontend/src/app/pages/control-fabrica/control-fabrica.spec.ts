import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ControlFabrica } from './control-fabrica';

describe('ControlFabrica', () => {
  let component: ControlFabrica;
  let fixture: ComponentFixture<ControlFabrica>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlFabrica],
    }).compileComponents();

    fixture = TestBed.createComponent(ControlFabrica);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

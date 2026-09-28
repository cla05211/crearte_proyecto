import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MuestrasFisicas } from './muestras-fisicas';

describe('MuestrasFisicas', () => {
  let component: MuestrasFisicas;
  let fixture: ComponentFixture<MuestrasFisicas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MuestrasFisicas],
    }).compileComponents();

    fixture = TestBed.createComponent(MuestrasFisicas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

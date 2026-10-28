import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Banderas } from './banderas';

describe('Banderas', () => {
  let component: Banderas;
  let fixture: ComponentFixture<Banderas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Banderas],
    }).compileComponents();

    fixture = TestBed.createComponent(Banderas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

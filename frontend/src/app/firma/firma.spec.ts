import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Firma } from './firma';

describe('Firma', () => {
  let component: Firma;
  let fixture: ComponentFixture<Firma>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Firma],
    }).compileComponents();

    fixture = TestBed.createComponent(Firma);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

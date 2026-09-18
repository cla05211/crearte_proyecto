import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Talles } from './talles';

describe('Talles', () => {
  let component: Talles;
  let fixture: ComponentFixture<Talles>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Talles],
    }).compileComponents();

    fixture = TestBed.createComponent(Talles);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

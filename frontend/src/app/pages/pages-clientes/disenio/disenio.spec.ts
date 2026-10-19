import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Disenio } from './disenio';

describe('Disenio', () => {
  let component: Disenio;
  let fixture: ComponentFixture<Disenio>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Disenio],
    }).compileComponents();

    fixture = TestBed.createComponent(Disenio);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

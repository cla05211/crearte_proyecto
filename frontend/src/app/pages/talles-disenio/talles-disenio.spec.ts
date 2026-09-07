import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TallesDisenio } from './talles-disenio';

describe('TallesDisenio', () => {
  let component: TallesDisenio;
  let fixture: ComponentFixture<TallesDisenio>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TallesDisenio],
    }).compileComponents();

    fixture = TestBed.createComponent(TallesDisenio);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Bancos } from './bancos';

describe('Bancos', () => {
  let component: Bancos;
  let fixture: ComponentFixture<Bancos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Bancos],
    }).compileComponents();

    fixture = TestBed.createComponent(Bancos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

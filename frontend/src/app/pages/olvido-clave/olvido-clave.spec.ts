import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OlvidoClave } from './olvido-clave';

describe('OlvidoClave', () => {
  let component: OlvidoClave;
  let fixture: ComponentFixture<OlvidoClave>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OlvidoClave],
    }).compileComponents();

    fixture = TestBed.createComponent(OlvidoClave);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

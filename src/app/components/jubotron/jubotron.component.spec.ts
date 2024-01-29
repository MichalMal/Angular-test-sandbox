import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JubotronComponent } from './jubotron.component';

describe('JubotronComponent', () => {
  let component: JubotronComponent;
  let fixture: ComponentFixture<JubotronComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [JubotronComponent]
    });
    fixture = TestBed.createComponent(JubotronComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

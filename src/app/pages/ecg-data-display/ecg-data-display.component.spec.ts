import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EcgDataDisplayComponent } from './ecg-data-display.component';

describe('EcgDataDisplayComponent', () => {
  let component: EcgDataDisplayComponent;
  let fixture: ComponentFixture<EcgDataDisplayComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EcgDataDisplayComponent]
    });
    fixture = TestBed.createComponent(EcgDataDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QtChartComponent } from './qt-chart.component';

describe('QtChartComponent', () => {
  let component: QtChartComponent;
  let fixture: ComponentFixture<QtChartComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [QtChartComponent]
    });
    fixture = TestBed.createComponent(QtChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

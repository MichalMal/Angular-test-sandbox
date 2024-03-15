import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-time-scale',
  templateUrl: './time-scale.component.html',
  styleUrls: ['./time-scale.component.scss']
})
export class TimeScaleComponent {

  @Input() dateTimeOfRecord: string = '';
  @Input() timeScale: {start: number, end: number} = {start: 0, end: 0};
  @Output() timeScaleChange = new EventEmitter<{start: number, end: number}>();

  onTimeScaleChange(newTimeScale: {start: number, end: number}): void {
    this.timeScale = newTimeScale;
    this.timeScaleChange.emit(this.timeScale);
  }

  addSeconds(seconds) {
    const dateCopy = new Date(this.dateTimeOfRecord);
    dateCopy.setMilliseconds(dateCopy.getMilliseconds() + seconds);
    return dateCopy;
  }
}

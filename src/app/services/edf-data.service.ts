import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';


@Injectable({
  providedIn: 'root',
})
export class EdfDataService {

  private dataRecordsSubject = new BehaviorSubject<any>(null);
  dataRecords$ = this.dataRecordsSubject.asObservable();

  setEdfModel(model: any) {
    this.dataRecordsSubject.next(model);
  }
}

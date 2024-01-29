import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { EdfFile, EdfHeader, EdfSignalHeader, EdfDataRecord } from '../models/edf-file.model';

@Injectable({
  providedIn: 'root'
})
export class EdfDataService {
  private headerSubject = new BehaviorSubject<EdfHeader | null>(null);
  header$ = this.headerSubject.asObservable();

  private signalHeadersSubject = new BehaviorSubject<EdfSignalHeader[] | null>(null);
  signalHeaders$ = this.signalHeadersSubject.asObservable();

  private dataRecordsSubject = new BehaviorSubject<EdfDataRecord[] | null>(null);
  dataRecords$ = this.dataRecordsSubject.asObservable();

  setHeader(header: EdfHeader): void {
    this.headerSubject.next(header);
  }

  setSignalHeaders(signalHeaders: EdfSignalHeader[]): void {
    this.signalHeadersSubject.next(signalHeaders);
  }

  setDataRecords(dataRecords: EdfDataRecord[]): void {
    this.dataRecordsSubject.next(dataRecords);
  }
}
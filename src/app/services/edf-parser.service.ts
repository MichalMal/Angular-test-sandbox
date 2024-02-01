import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { EdfDataService } from './edf-data.service';

@Injectable({
  providedIn: 'root',
})
export class EdfParserService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient, private edfDataService: EdfDataService) {}

  async uploadEdfFile(file: File): Promise<Observable<any>> {
    const formData = new FormData();
    formData.append('edfFile', file);

    return this.http.post(`${this.apiUrl}/upload-edf`, formData).pipe(
      catchError((error) => {
        console.error('Error uploading EDF file:', error);
        return throwError(() => new Error(error.message));
      })
    );
  }
}
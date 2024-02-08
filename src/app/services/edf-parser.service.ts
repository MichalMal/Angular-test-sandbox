import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { EdfDecoder } from 'edfdecoder';

@Injectable({
  providedIn: 'root',
})
export class EdfParserService {

  constructor() {}

  async uploadEdfFile(file: File): Promise<Observable<any>> {

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const arrayBuffer = (event.target as FileReader).result as ArrayBuffer;
          const decoder = new EdfDecoder();
          decoder.setInput(arrayBuffer)
          console.log("Decoding...");
          decoder.decode();
          const edf = decoder.getOutput();
          resolve(edf);

        } catch (error) {
          console.error('Error parsing EDF file:', error);
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }
}
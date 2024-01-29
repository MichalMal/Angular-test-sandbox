import { Injectable } from '@angular/core';
import {
  EdfFile,
  EdfHeader,
  EdfSignalHeader,
  EdfDataRecord,
} from '../models/edf-file.model';
import { EdfDataService } from './edf-data.service';

@Injectable({
  providedIn: 'root',
})
export class EdfParserService {
  private worker!: Worker;

  constructor(private edfDataService: EdfDataService) {
    if (typeof Worker !== 'undefined') {
      // Create a new Web Worker
      this.worker = new Worker(
        new URL('../workers/edf-parser.worker.ts', import.meta.url)
      );
    } else {
      // Web Workers are not supported in this environment
      // You should add a fallback so your program still executes correctly
    }
  }

  async parseBlob(file: Blob): Promise<void> {
    const buffer = (await file
      .arrayBuffer()
      .catch(() => console.error('some edf error'))) as ArrayBuffer;
    const dataView = new DataView(buffer);

    console.log('Starting to parse edf');
    console.log('Parsing header');
    const header = this.parseHeader(dataView);
    this.edfDataService.setHeader(header);

    console.log('Parsing signal headers');

    const signalHeaders = this.parseSignalHeaders(
      dataView,
      header.numberOfSignals
    );
    this.edfDataService.setSignalHeaders(signalHeaders);

    console.log('Parsing data records');

    this.worker.postMessage({ dataView, header, signalHeaders });

    // Listen for messages from the worker
    this.worker.onmessage = ({ data }) => {
      if (data.error) {
        console.error('Error from worker:', data.error);
      } else {
        try {
          this.edfDataService.setDataRecords(data);
        } catch (error) {
          console.error('Error setting data records:', error);
        }
      }
    };
  }

  private parseHeader(dataView: DataView): EdfHeader {
    // Parse the header fields from the DataView
    // This is a simplified example, you may need to adjust the byte lengths and offsets
    const version = this.readString(dataView, 0, 8);
    const patientId = this.readString(dataView, 8, 80);
    const recordingId = this.readString(dataView, 88, 80);
    const startDate = this.readString(dataView, 168, 8);
    const startTime = this.readString(dataView, 176, 8);
    const numberOfBytesInHeader = parseInt(this.readString(dataView, 184, 8));
    const numberOfDataRecords = parseInt(this.readString(dataView, 236, 8));
    const durationOfDataRecord = parseInt(this.readString(dataView, 244, 8));
    const numberOfSignals = parseInt(this.readString(dataView, 252, 4));

    console.log('Full Header:', {
      version,
      patientId,
      recordingId,
      startDate,
      startTime,
      numberOfBytesInHeader,
      numberOfDataRecords,
      durationOfDataRecord,
      numberOfSignals,
    });

    return {
      version,
      patientId,
      recordingId,
      startDate,
      startTime,
      numberOfBytesInHeader,
      numberOfDataRecords,
      durationOfDataRecord,
      numberOfSignals,
    } as EdfHeader;
  }

  private parseSignalHeaders(
    dataView: DataView,
    numberOfSignals: number
  ): EdfSignalHeader[] {
    const signalHeaders: EdfSignalHeader[] = [];

    for (let i = 0; i < numberOfSignals; i++) {
      const offset = 256 + i * 256;
      const label = this.readString(dataView, offset, 16);
      const transducerType = this.readString(dataView, offset + 16, 80);
      const physicalDimension = this.readString(dataView, offset + 96, 8);
      const physicalMinimum = parseFloat(
        this.readString(dataView, offset + 104, 8)
      );
      const physicalMaximum = parseFloat(
        this.readString(dataView, offset + 112, 8)
      );
      const digitalMinimum = parseInt(
        this.readString(dataView, offset + 120, 8)
      );
      const digitalMaximum = parseInt(
        this.readString(dataView, offset + 128, 8)
      );
      const preFiltering = this.readString(dataView, offset + 136, 80);
      // Update the parsing logic for numberOfSamples
      const numberOfSamplesOffset = offset + 236; // Assuming this offset, adjust if needed
      const numberOfSamplesString = this.readString(
        dataView,
        numberOfSamplesOffset,
        8
      );
      const numberOfSamples = parseInt(numberOfSamplesString);
      if (isNaN(numberOfSamples)) {
        console.error(
          `Failed to parse number of samples for signal ${
            i + 1
          }: ${numberOfSamplesString}`
        );
      }

      const dataType = 'int16'; // You'll need to determine the correct data type here

      signalHeaders.push({
        label,
        transducerType,
        physicalDimension,
        physicalMinimum,
        physicalMaximum,
        digitalMinimum,
        digitalMaximum,
        preFiltering,
        numberOfSamples,
        dataType,
      });
      console.log(
        `Signal ${i + 1}: numberOfSamples = ${signalHeaders[i].numberOfSamples}`
      );
    }
    console.log('Signal headers:', signalHeaders);
    return signalHeaders;
  }

  private readString(
    dataView: DataView,
    offset: number,
    length: number
  ): string {
    let result = '';
    const end = offset + length;

    for (let i = offset; i < end; i++) {
      if (i >= dataView.byteLength) {
        break;
      }
      const char = dataView.getUint8(i);
      result += String.fromCharCode(char);
    }
    return result.trim();
  }
}

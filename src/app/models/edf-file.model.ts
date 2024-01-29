export interface EdfFile {
  header: EdfHeader;
  signalHeaders: EdfSignalHeader[];
  dataRecords: EdfDataRecord[];
}

export interface EdfHeader {
  version: string;
  patientId: string;
  recordingId: string;
  startDate: string;
  startTime: string;
  numberOfBytesInHeader: number;
  numberOfDataRecords: number;
  durationOfDataRecord: number;
  numberOfSignals: number;
}

export interface EdfSignalHeader {
  label: string;
  transducerType: string;
  physicalDimension: string;
  physicalMinimum: number;
  physicalMaximum: number;
  digitalMinimum: number;
  digitalMaximum: number;
  preFiltering: string;
  numberOfSamples: number;
  dataType: 'int16' | 'int32' | 'float32' | 'float64';
}

export interface EdfDataRecord {
  [label: string]: number[];
}

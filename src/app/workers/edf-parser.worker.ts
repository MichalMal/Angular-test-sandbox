/// <reference lib="webworker" />
import {
  EdfDataRecord,
  EdfHeader,
  EdfSignalHeader,
} from '../models/edf-file.model';

// Define the event listener for the 'message' event
addEventListener('message', ({ data }) => {
  const { dataView, header, signalHeaders } = data;

  // console.log('Worker: Received data for parsing');

  // Parse the data records
  const dataRecords = parseDataRecords(dataView, header, signalHeaders);

  // console.log('Worker: Sending parsed data back to the main thread');

  // Send the data records back to the main thread
  postMessage(dataRecords);
});

function parseDataRecords(
  dataView: DataView,
  header: EdfHeader,
  signalHeaders: EdfSignalHeader[]
): EdfDataRecord[] {
  // console.log('Worker: parseDataRecords');

  // Initialize an array to hold the data records
  const dataRecords: EdfDataRecord[] = [];

  // Calculate the start of the data records in the DataView
  const dataRecordsStart = header.numberOfBytesInHeader;
  // console.log("Signal headers:", signalHeaders);
  // Calculate the total number of samples per data record
  let totalSamplesPerRecord: number = 0;
  try {
    totalSamplesPerRecord = signalHeaders.reduce((total, signalHeader) => {
      // console.log(`Signal: ${signalHeader.label}, numberOfSamples: ${signalHeader.numberOfSamples}`);
      return total + signalHeader.numberOfSamples;
    }, 0);
  } catch (error) {
    console.error('Error calculating totalSamplesPerRecord:', error);
  }

  // Define the size of each sample based on the data type of the signals
  let sampleSize: number;
  if (signalHeaders.length > 0) {
    switch (signalHeaders[0].dataType) {
      case 'int16':
        sampleSize = 2;
        break;
      case 'int32':
      case 'float32':
        sampleSize = 4;
        break;
      case 'float64':
        sampleSize = 8;
        break;
      default:
        throw new Error(`Unsupported data type: ${signalHeaders[0].dataType}`);
    }
  } else {
    throw new Error('No signal headers available.');
  }

  // Loop over each data record
  for (let i = 0; i < header.numberOfDataRecords; i++) {
    // console.log(`Processing data record ${i + 1}/${header.numberOfDataRecords}`);

    // Calculate the start position of this data record in the DataView
    const dataRecordStart =
      dataRecordsStart + i * totalSamplesPerRecord * sampleSize;

    // Initialize an object to hold the data for this data record
    const dataRecord: EdfDataRecord = {};

    // Initialize an array to hold the data for this data record
    const data: number[] = [];

    // Calculate the position of this signal's samples in the DataView
    const signalDataView = new DataView(
      dataView.buffer,
      dataRecordStart,
      totalSamplesPerRecord * sampleSize
    );

    // Loop over each signal
    for (const signalHeader of signalHeaders) {
      // console.log(`Processing signal: ${signalHeader.label}`);

      // Initialize an array to hold the data for this signal
      const signalData: number[] = [];

      // Loop over each sample
      for (let j = 0; j < signalHeader.numberOfSamples; j++) {
        // Calculate the position of this sample in the DataView
        const position = i * totalSamplesPerRecord + j;
      
        // console.log(`Reading sample ${j + 1}/${signalHeader.numberOfSamples} at position ${position}`);
      
        // Log the intermediate variables for debugging
        // console.log(`i: ${i}, totalSamplesPerRecord: ${totalSamplesPerRecord}, j: ${j}, signalHeader.numberOfSamples: ${signalHeader.numberOfSamples}`);
        // console.log(`Position calculation: ${i} * ${totalSamplesPerRecord} + ${j} = ${position}`);
      
        // Ensure that the position is within the bounds of the DataView
        if (position >= 0 && position * sampleSize < signalDataView.byteLength) {
          // Read the sample from the DataView
          let sample: number;
          switch (signalHeader.dataType) {
            case 'int16':
              sample = signalDataView.getInt16(position * sampleSize, true);
              break;
            case 'int32':
              sample = signalDataView.getInt32(position * sampleSize, true);
              break;
            case 'float32':
              sample = signalDataView.getFloat32(position * sampleSize, true);
              break;
            case 'float64':
              sample = signalDataView.getFloat64(position * sampleSize, true);
              break;
            default:
              throw new Error(`Unsupported data type: ${signalHeader.dataType}`);
          }
      
          // console.log(`Sample value: ${sample}`);
      
          // Add the sample to the signalData array
          signalData.push(sample);
        } else {
          console.error(`Error: Attempted to read sample beyond the bounds of the DataView.`);
        }
      }

      // console.log(`Finished processing signal: ${signalHeader.label}`);

      // Add the signalData array to the data record
      dataRecord[signalHeader.label] = signalData;
    }

    // Add the data record to the array of data records
    dataRecords.push(dataRecord);

    // console.log(`Finished processing data record ${i + 1}/${header.numberOfDataRecords}`);
  }

  // console.log('Finished parsing dataRecords');

  return dataRecords;
}

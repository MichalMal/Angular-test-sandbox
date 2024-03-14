import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EdfParserService } from 'src/app/services/edf-parser.service';
import { EdfDataService } from 'src/app/services/edf-data.service'; // Import the shared service

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  isLoading: boolean = false;

  constructor(
    private edfParserService: EdfParserService,
    private router: Router, // Inject the Router
    private edfDataService: EdfDataService // Inject the shared service
  ) {}

  ngOnInit(): void {
    console.clear();
  }

  async onFileSelected(event: any): Promise<void> {
    const file: File = event.target.files[0];
    if (file) {
      if (file.name.split('.')?.pop()?.toLowerCase() === 'edf') {
        this.isLoading = true;
        this.edfParserService
          .uploadEdfFile(file)
          .then((response) => {
            this.edfDataService.setEdfModel(response);
            this.router.navigate(['/ecg-data']);
          })
          .catch((error) => {
            console.error('Error uploading EDF file:', error);
          })
          .finally(() => {
            this.isLoading = false;
          });
      } else if (file.name.split('.')?.pop()?.toLowerCase() === 'json') {
        this.isLoading = true;
        this.edfParserService
          .uploadJsonFile(file)
          .then((response) => {
            this.edfDataService.setEdfModel(response);
            this.router.navigate(['/json-data']);
          })
          .catch((error) => {
            console.error('Error uploading JSON file:', error);
          })
          .finally(() => {
            this.isLoading = false;
          });
      } else {
        console.error('No file selected.');
      }
    }
  }
}

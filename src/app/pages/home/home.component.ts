import { Component, ElementRef, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EdfParserService } from 'src/app/services/edf-parser.service';
import { EdfDataService } from 'src/app/services/edf-data.service'; // Import the shared service

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  
  private element: any;
  edf = [];

  constructor(
    private edfParserService: EdfParserService,
    private el: ElementRef,
    private router: Router, // Inject the Router
    private edfDataService: EdfDataService // Inject the shared service
  ) {}


  ngOnInit(): void {

  }

  async onFileSelected(event: any): Promise<void> {
    const file: File = event.target.files[0];
    
    if (file) {
      if (file.name.split('.')?.pop()?.toLowerCase() === 'edf') {
        const parsedEdf = await this.edfParserService.parseBlob(file).then(
          () => {
              this.router.navigate(['/ecg-data']);
          },
          (error) => {
            console.error('Error parsing EDF+ file:', error);
            alert('Error parsing EDF+ file!');
          },
        );
      } else {
        alert('Please upload a valid file!');
        return;
      }
    }
  }
}
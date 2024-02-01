import { AfterViewInit, Component, ElementRef, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EdfParserService } from 'src/app/services/edf-parser.service';
import { EdfDataService } from 'src/app/services/edf-data.service'; // Import the shared service

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, AfterViewInit {
 
  isLoading: boolean = false;

  constructor(
    private edfParserService: EdfParserService,
    private el: ElementRef,
    private router: Router, // Inject the Router
    private edfDataService: EdfDataService // Inject the shared service
  ) {}

  ngOnInit(): void {
    console.clear();
  }

  ngAfterViewInit(): void {
    // this.isLoading = false;
  }

  async onFileSelected(event: any): Promise<void> {
    const file: File = event.target.files[0];
  
    if (file) {
      if (file.name.split('.')?.pop()?.toLowerCase() === 'edf') {
        this.isLoading = true;
        const subscription = (await this.edfParserService
          .uploadEdfFile(file))
          .subscribe({
            next: (response) => {
              
              //               // Create a downloadable JSON file
              // const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(response));
              // const downloadAnchorNode = document.createElement('a');
              // downloadAnchorNode.setAttribute("href",     dataStr);
              // downloadAnchorNode.setAttribute("download", "response.json");
              // document.body.appendChild(downloadAnchorNode); // required for firefox
              // downloadAnchorNode.click();
              // downloadAnchorNode.remove();
              
              
              this.edfDataService.setEdfModel(response); 
              this.router.navigate(['/ecg-data']);
            },
            error: (error) => {
              console.error('Error uploading EDF file:', error);
            },
            complete: () => {
              console.log('EDF file uploaded successfully');
              subscription.unsubscribe();
            }
      });
      } else {  
        console.error('No file selected.');
      }
    }
  }
}

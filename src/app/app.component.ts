import {
  Component,
  inject,
  ElementRef,
  ViewChild,
  NgZone,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ArticleService } from './service/article.service';
import { CommonModule, NgIf } from '@angular/common';
import { catchError, tap } from 'rxjs/operators';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { debounceTime, Subject, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { takeUntil } from 'rxjs/operators';
import Cropper from 'cropperjs';
import { ArticleImageComponent } from './article-image/article-image.component';
import { ChangeDetectorRef } from '@angular/core';

interface Journalist {
  JournalistID: number;
  Fname: string;
  Lname: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    FormsModule,
    MatAutocompleteModule,
    MatInputModule,
    MatOptionModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    CommonModule,
    NgIf,
    ArticleImageComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  @ViewChild('imageToCrop', { static: false })
  imageElement!: ElementRef<HTMLImageElement>;
  cropper: Cropper | null = null;
  isCropEnabled = false;
  croppedImage: string = '';
  isPreviewMode = false;
  isPreviewImage = false;
  fileName: string = '';
  isZoomEnabled: boolean = false;
  isUploadedImage: boolean = false;
  isSaveImage: boolean = false;
  zoomLevel: number = 1;
  imageSrc = ''; // Default image
  imageKey: string = '';
  constructor(private cdr: ChangeDetectorRef, private ngZone: NgZone) {}
  selectedFile: File | null = null;
  serverImageURL = '';
  serverHTMLurl = '';
  htmlURL = '';

  private destroy$ = new Subject<void>(); // Subject to signal cancellation
  articleService = inject(ArticleService);
  sanitizer = inject(DomSanitizer);
  isLoading: boolean = false;
  isModalLoading: boolean = false;
  isLoadingOcr: boolean = false;
  article: any = {};
  articles: any = [];
  pubdateFormatted: string = '';
  title = 'Frontend';
  selectedDate: string = '';
  publications: any[] = [];
  selectedPublication: { PublicationTitle: string; Edition: string } = {
    PublicationTitle: '',
    Edition: '',
  }; // To hold the selected publication
  filteredPublications: any[] = [];
  articlesPageNumber: any[] = [];
  selectedPageNumber: string = '';
  selectedPrimaryID: number = 0;
  articleTitles: any[] = [];
  filterArticleTitles: any[] = [];
  selectedArticleId: string = '';
  keywords: { keyid: string; PrimarykeyID: string; keyword: string }[] = []; // To hold keyid and keyword
  filterKeyword: { keyword: string }[] = [];
  filterString: any[] = [];
  additionalKeyowrds: { keyword: string }[] = [];
  page_Number: {
    pageNumber: string;
    fullText: string;
    pageName: string;
    imageDirectory: string;
    Image_Name: string;
    htmlDirectory: string;
    html: string;
    md5id: string;
    start_acq_time: Date;
    end_acq_time: Date;
  }[] = [];
  timeTaken = '';
  baseUrl = '';
  url = '';
  isCopied = false;
  showdetails: boolean = false;
  getTotalNoOfArticles: boolean = false;
  highlightedText: SafeHtml = '';
  titleControl = new FormControl(); // Form control for autocomplete
  publicationControl = new FormControl('');
  BylineControl = new FormControl();
  searchTerms = new Subject<string>(); // Subject to handle input changes
  keywordFilterString: boolean = false;
  showModal: boolean = false;
  showRemoveModal: boolean = false;
  UserID: string = '';
  isArticleIdSelected: boolean = true;
  Journalistarray: any[] = [];
  sectorsArray: any[] = [];
  subSectorArray: any[] = [];
  filterJournalistarray: any[] = [];
  journalistNameArray: Journalist[] = [];
  selectedJourId: number = 0; // Bind this variable to the selected value in the dropdown
  byline: string = ''; // This will hold the concatenated name
  jourFname: string = '';
  jourLname: string = '';
  newPageName: string = '';
  newPageNumber: string = '';
  selectedJournalistName: string = '';
  selectedJournalistId: number | null = null; // You can use this to keep track of the selected journalist
  removeJournalistId: number = 0;
  pageNumber: string = '';
  imageURL: string = '';
  selectedSectorId: number = 0;
  mode: string = 'manual'; // default

  ngOnInit() {
    this.selectedPublication = {
      PublicationTitle: '',
      Edition: '',
    };
    this.checkUser();
    this.selectedDate = this.formatDate(new Date());
    this.getPublications();
    this.searchTerms
      .pipe(
        debounceTime(300), // Adjust the debounce time as needed
        switchMap((term) => {
          if (term && term.trim().length > 3) {
            return this.filterPublications(term);
          } else {
            // Return empty array if less than 2 characters
            return of([]);
          }
        })
      )
      .subscribe((filteredPublications) => {
        this.filteredPublications = filteredPublications;
        this.isLoading = false; // Set loading to true while filtering or fetching
      });
    // this.isLoading = false;

    this.publicationControl.valueChanges.subscribe((value) => {
      this.isLoading = true;
      this.selectedPublication = {
        PublicationTitle: '',
        Edition: '',
      };
      if (!value) {
        this.showdetails = false;
        this.articlesPageNumber = [];
        this.filterArticleTitles = [];
        this.titleControl.reset();
      }
      this.searchTerms.next(value || '');
      // console.log(this.selectedPublication);
    });

    this.BylineControl.valueChanges
      .pipe(
        debounceTime(300), // Debounce for better UX and performance
        switchMap((value) => {
          // this.isLoading = true
          // Only trigger filtering if input length is >= 2 characters
          if (value && value.trim().length > 3) {
            return this.filterJournalists(value);
          } else {
            // Return empty array if less than 2 characters
            return of([]);
          }
        })
      )
      .subscribe((filteredJournalists) => {
        this.filterJournalistarray = filteredJournalists;
        this.isLoading = false; // Hide loading spinner
      });
  }

  filterJournalists(term: string) {
    this.isLoading = true;
    if (!term) {
      return of([]); // Return an empty array if no term is entered
    }

    const searchTerm = term.toLowerCase();
    const names = searchTerm.trim().split(' ');

    // Extract first and last names
    const jourFname = names[0];
    const jourLname = names.length > 1 ? names.slice(1).join(' ') : '';

    // Filter journalists based on first and last name
    return of(
      this.Journalistarray.filter((jour) => {
        const matchesFirstName = jour.Fname?.toLowerCase().includes(jourFname);
        const matchesLastName = jourLname
          ? jour.Lname?.toLowerCase().includes(jourLname)
          : true;
        return matchesFirstName && matchesLastName; // Match both first and last name
      })
    );
  }

  getPublications() {
    this.isLoading = true;
    try {
      this.articleService
        .getPublications()
        .pipe(
          tap((result) => {
            // Handle the successful response
            this.publications = result;
            this.isLoading = false;
          }),
          catchError((error) => {
            // Handle the error and log it
            console.error('Error fetching publications:', error);
            this.isLoading = false;
            // Return an empty array or a suitable fallback value
            return of([]); // You can replace this with another fallback if needed
          })
        )
        .subscribe();
    } catch (error) {
      // Catch any errors that occur during the execution of the try block
      console.error('Error occurred while getting publications:', error);
      this.isLoading = false; // Ensure that loading is set to false in case of error
    }
  }

  formatDateForMail(inputDate: string): string {
    let date: Date;

    if (/^\d{4}-\d{2}-\d{2}$/.test(inputDate)) {
      // Format: YYYY-MM-DD (e.g., 2024-03-06)
      date = new Date(inputDate);
    } else {
      // Format: DD-MMM-YYYY (e.g., 02-Feb-2025)
      const parts = inputDate.split('-');
      const day = parseInt(parts[0], 10);
      const month = new Date(Date.parse(parts[1] + ' 1, 2000')).getMonth(); // Get month index
      const year = parseInt(parts[2], 10);

      date = new Date(year, month, day);
    }

    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    const day = date.getDate().toString().padStart(2, '0'); // Two-digit day
    const month = date.toLocaleString('en-US', { month: 'short' }); // Short month name (e.g., Mar)
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  }

  formatDate(dateString: Date): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Extract the year, month, and day in 'YYYY-MM-DD' format
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2); // Months are zero-indexed
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }

  formatDateAndTime(dateString: Date): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Extract the year, month, and day in 'YYYY-MM-DD' format
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2); // Months are zero-indexed
    const day = ('0' + date.getDate()).slice(-2);
    const hours = ('0' + date.getHours()).slice(-2);
    const minutes = ('0' + date.getMinutes()).slice(-2);
    const seconds = ('0' + date.getSeconds()).slice(-2);
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  onDateChange(e: string) {
    this.isLoading = true;
    this.destroy$.next(); // This will trigger cancellation of the ongoing OCR process
    this.selectedDate = e;
    this.showdetails = false;
    if (this.articlesPageNumber !== null) {
      this.articlesPageNumber = [];
      // this.articlesPageNumber = [];
      this.filterArticleTitles = [];
      this.titleControl.reset();
      this.selectedArticleId = '';
      this.selectedPageNumber = '';
      if (this.selectedPublication.PublicationTitle !== '') {
        this.mode="manual";
        this.getTotalArticles(this.selectedDate);
      }
    }

    // this.getTotalArticles(this.selectedDate);
  }

  onPublicationChange(event: Event) {
    this.destroy$.next(); // This will trigger cancellation of the ongoing OCR process
    this.showdetails = false;
    this.isLoading = true;
    const selectElement = event.target as HTMLSelectElement;
    // console.log(selectElement.value);
    const selectedPublication = this.publications.find(
      (publication) =>
        publication.PublicationTitle + ' ' + publication.Edition ===
        selectElement.value
    );
    // console.log(selectedPublication);
    this.selectedArticleId = '';
    this.selectedPageNumber = '';
    this.selectedPublication = selectedPublication;
    this.getTotalNoOfArticles = true;
    this.mode="manual";
    this.getTotalArticles(this.selectedDate);
  }

  onToggleChange() {
    if (this.selectedDate && this.selectedPublication) {
      this.getTotalArticles(this.selectedDate);
          this.showdetails = false;

    }
  }

  getTotalArticles(pubdate: string) {
    const PublicationTitle = this.selectedPublication?.PublicationTitle;
    const Edition = this.selectedPublication?.Edition;

    this.isLoading = true; // Indicate that the process has started

    try {
      this.articleService
        .getTotalArticles(pubdate, PublicationTitle, Edition, this.mode)
        .subscribe(
          (result) => {
            // Handle the successful response
            const uniquePageNumbers = new Set();
            this.articlesPageNumber = result.filter((article: any) => {
              if (!uniquePageNumbers.has(article.Page_Number)) {
                uniquePageNumbers.add(article.Page_Number); // Add Page_Number to the Set
                return true; // Keep this article
              }
              return false; // Skip duplicate articles
            });

            const uniqueTitles = new Set<string>(); // Set for unique titles
            // Filter out duplicate titles
            this.filterArticleTitles = result.filter((article: any) => {
              if (!uniqueTitles.has(article.ArticleTitle)) {
                uniqueTitles.add(article.ArticleTitle); // Add unique title to the Set
                return true; // Keep this article with the title
              }
              return false; // Skip if title already exists in the Set
            });

            this.articleTitles = this.filterArticleTitles; // Assign filtered titles
            this.titleControl.reset(); // Reset title control

            this.isLoading = false; // Set loading to false after operation is complete
          },
          (error) => {
            // Handle any error that occurs during the API request
            console.error('Error fetching articles:', error);
            this.isLoading = false; // Set loading to false if there's an error
          }
        );
    } catch (error) {
      // Catch any synchronous errors, if any occur outside the observable
      console.error('Error in getTotalArticles function:', error);
      this.isLoading = false; // Ensure loading is set to false in case of any error
    }
  }

  onPageNumberChange(event: Event) {
    // this.isLoading = true;
    this.destroy$.next(); // This will trigger cancellation of the ongoing OCR process
    const selectElement = event.target as HTMLSelectElement;
    this.selectedPageNumber = String(selectElement.value);
    // console.log(this.selectedPageNumber);

    // Fetch articles for the selected page number
    if (this.selectedPageNumber !== null) {
      this.getArticlesByPageNo(this.selectedDate, this.selectedPageNumber);
    }
  }

  onKeywordFilterString(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedPrimaryID = Number(selectElement.value);
    // console.log(this.selectedPrimaryID);

    // Fetch articles for the selected page number
    if (this.selectedPrimaryID !== 0) {
      this.articleService
        .getFilterString(this.selectedPrimaryID)
        .subscribe((result) => {
          // console.log(result);
          this.filterString = result;
          this.keywordFilterString = true;
        });
    } else {
      this.filterString = [];
      this.keywordFilterString = false;
    }
  }

  getArticlesByPageNo(pubdate: string, pageNumber: string) {
    const PublicationTitle = this.selectedPublication?.PublicationTitle;
    const Edition = this.selectedPublication?.Edition;

    this.isLoading = true; // Indicate loading state

    try {
      this.articleService
        .getArticlesByPageNumber(pubdate, PublicationTitle, Edition, pageNumber, this.mode)
        .subscribe(
          (result) => {
            // Handle the successful response
            this.titleControl.reset();
            this.articleTitles = result;
            this.filterArticleTitles = result; // Initialize filtered list

            this.isLoading = false; // Set loading to false when data is loaded
          },
          (error) => {
            // Handle any errors from the HTTP request
            console.error('Error fetching articles by page number:', error);
            this.isLoading = false; // Ensure loading is stopped even in case of error
          }
        );
    } catch (error) {
      // Catch any unexpected synchronous errors
      console.error('Error in getArticlesByPageNo function:', error);
      this.isLoading = false; // Ensure loading is stopped in case of error
    }
  }

  onArticleIdChange(event: Event) {
    // this.showdetails = true;
    const selectElement = event.target as HTMLSelectElement;
    this.selectedArticleId = selectElement.value;
    console.log(this.selectedArticleId);
    if (this.selectedArticleId !== '') {
      this.isArticleIdSelected = false;
    }
    // this.destroy$.next();  // This will trigger cancellation of the ongoing OCR process
    // this.isLoading = false;  // Stop loading spinner or indicator
  }

  getJournalists() {
    this.destroy$.next(); // This will trigger cancellation of the ongoing OCR process
    return new Promise<void>((resolve, reject) => {
      this.articleService
        .getJournalists()
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (result: any) => {
            // console.log('API response:', result); // Check if the response is structured correctly

            if (result && result.results) {
              this.Journalistarray = result.results; // Assuming the array is under 'results' key
              // console.log('Fetched Journalists:', this.Journalistarray); // Inspect fetched data

              // Resolve the promise when journalists are fetched
              resolve();
            } else {
              console.error(
                'Invalid response structure. Expected "results" array.'
              );
              reject('Invalid response structure');
            }
          },
          (error) => {
            console.error('Error fetching journalists:', error);
            reject(error); // Reject the promise in case of an error
          }
        );
    });
  }

  getAllSectors() {
    this.destroy$.next(); // This will trigger cancellation of the ongoing OCR process
    return new Promise<void>((resolve, reject) => {
      this.articleService
        .getAllSectors()
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (response: any) => {
            // console.log('API response:', response.data); // Check if the response is structured correctly

            if (response.data) {
              this.sectorsArray = response.data; // Assuming the array is under 'results' key
              // console.log('Fetched Journalists:', this.Journalistarray); // Inspect fetched data

              // Resolve the promise when journalists are fetched
              resolve();
            } else {
              console.error(
                'Invalid response structure. Expected "results" array.'
              );
              this.sectorsArray = [];
              reject('Invalid response structure');
            }
          },
          (error) => {
            console.error('Error fetching sectors:', error);
            reject(error); // Reject the promise in case of an error
          }
        );
    });
  }

  getFullArticle() {
    this.destroy$.next(); // This will trigger cancellation of the ongoing OCR process
    this.isLoading = true;
    this.additionalKeyowrds = [];
    this.keywordFilterString = false;
    this.selectedJournalistName = '';
    this.Journalistarray = [];
    this.byline = '';
    this.filterJournalistarray = [];
    this.selectedJourId = 0;
    this.subSectorArray = [];
    // this.keywords = [];
    // this.highlightedText = '';

    try {
      // Call to getJournalists and handle the promise
      this.getJournalists()
        .then(() => {
          if (this.filterArticleTitles.length > 0) {
            this.articleService
              .getFullTextByID(this.selectedArticleId)
              .subscribe(
                (result) => {
                  this.isLoading = false;
                  this.showdetails = true;
                  // console.log(result);
                  this.article = result[0];

                  this.getAllSectors();
                  // Process the result
                  this.journalistNameArray = result
                    .map((item: any) => ({
                      JournalistID: item.JournalistID,
                      Fname: item.Fname,
                      Lname: item.Lname,
                    }))
                    .filter(
                      (journalist: any) =>
                        journalist.Fname !== null &&
                        journalist.Fname !== undefined &&
                        journalist.Fname !== '' &&
                        journalist.Lname !== null &&
                        journalist.Lname !== undefined
                      // journalist.Lname !== ''
                    )
                    .filter(
                      (value: any, index: any, self: any) =>
                        index ===
                        self.findIndex(
                          (t: any) =>
                            t.JournalistID === value.JournalistID &&
                            t.Fname === value.Fname &&
                            t.Lname === value.Lname
                        )
                    );
                  this.pageNumber = this.article.Page_Number;
                  // console.log('pageNumber : ' + this.pageNumber);

                  this.newPageName = this.article.pagename;
                  this.newPageNumber = this.article.Page_Number;

                  if (this.article.ave) {
                    this.article.ave = parseFloat(this.article.ave).toFixed(2);
                  }

                  this.articles = result;
                  this.keywords = [];

                  result.forEach((article: any) => {
                    const { keyid, PrimarykeyID, MergedKeywordFilter } =
                      article;
                    const exists = this.keywords.some(
                      (item) => item.keyid === keyid
                    );

                    if (!exists) {
                      this.keywords.push({
                        keyid: keyid,
                        PrimarykeyID: PrimarykeyID,
                        keyword: MergedKeywordFilter,
                      });
                    }
                  });

                  this.page_Number = [];
                  result.forEach((article: any) => {
                    const {
                      Page_Number,
                      pagename,
                      full_text,
                      imagedirectory,
                      Image_name,
                      htmldirectory,
                      html,
                      md5id,
                      start_acq_time,
                      end_acq_time,
                    } = article;

                    const exists = this.page_Number.some(
                      (item) => item.pageNumber === Page_Number
                    );

                    if (!exists) {
                      this.page_Number.push({
                        pageNumber: Page_Number,
                        pageName: pagename,
                        fullText: full_text,
                        imageDirectory: imagedirectory,
                        Image_Name: Image_name,
                        htmlDirectory: htmldirectory,
                        html: html,
                        md5id: md5id,
                        start_acq_time: start_acq_time,
                        end_acq_time: end_acq_time,
                      });
                    }
                  });

                  // console.log('page_number: ', this.page_Number);

                  // this.baseUrl = 'https://databank.irmplservices.com/backup';
                  this.baseUrl = 'https://myimpact.in/backup';

                  // this.baseUrl = '/backup';

                  this.url = `${this.baseUrl}/${this.article.imagedirectory}/${this.article.Image_name}`;
                  // console.log(this.url);

                  this.getTimeTaken(
                    this.article.start_acq_time,
                    this.article.end_acq_time
                  );
                  if (this.article.full_text && this.article.full_text.trim() !== '') {
                    this.highlightedText = this.highlightExistingKeywords(this.article.full_text);
                  } else {
                    this.highlightedText = '';
                  }
                  this.selectedPrimaryID = 0;
                  // this.articleService
                  //   .getSubsectorByID(this.article.SectorID)
                  //   .subscribe((result) => {
                  //     console.log(result.data);
                  //     this.subSectorArray = result.data;
                  //   });
                },
                (error) => {
                  // Error handler for the API request
                  console.error('Error fetching full article:', error);
                  this.isLoading = false; // Ensure loading is set to false on error
                  // Optionally, you could show an error message to the user
                }
              );
            this.isArticleIdSelected = true;
          } else {
            // If no article is selected, reset the state
            this.article = '';
            this.highlightedText = '';
            this.keywords = [];
            this.timeTaken = '';
            this.isLoading = false; // Set loading to false when no articles are selected
          }
        })
        .catch((error) => {
          // Handle error for the getJournalists call
          console.error('Error fetching journalists:', error);
          this.isLoading = false; // Set loading to false in case of error
        });
    } catch (error) {
      // Handle unexpected errors in the try block
      console.error('Unexpected error in getFullArticle:', error);
      this.isLoading = false; // Set loading to false if there's an unexpected error
    }
  }

  getJournalistNames(): {
    Fname: string;
    Lname: string;
    journalistId: number;
  }[] {
    return this.journalistNameArray.map((journalist: any) => ({
      // name: `${journalist.Fname} ${journalist.Lname}`,
      Fname: journalist.Fname,
      Lname: journalist.Lname,
      journalistId: journalist.JournalistID,
    }));
  }

  onJournalistIdChange(journalistId: number): void {
    // console.log('Selected JournalistID:', journalistId);
    // const selectElement = event.target as HTMLSelectElement;
    // this.selectedJourId = Number(selectElement.value);
    // console.log(this.selectedJourId);

    const selectedJournalist = this.Journalistarray.find(
      (j: any) => j.JourID === journalistId
    );

    // console.log(selectedJournalist);

    if (selectedJournalist) {
      const isDuplicate = this.journalistNameArray.some(
        (journalist) => journalist.JournalistID === journalistId
      );

      if (!isDuplicate) {
        this.journalistNameArray.push({
          JournalistID: selectedJournalist.JourID,
          Fname: selectedJournalist.Fname,
          Lname: selectedJournalist.Lname,
        });

        // console.log(this.journalistNameArray); // For debugging to see the updated array
      }
    }
    this.BylineControl.reset(); // Reset the input field
  }

  onSectorIdChange(event: Event): void {
    // this.subSectorArray = [];
    // console.log('Selected sectorID:', sectorId);
    const selectedSectorId = Number((event.target as HTMLSelectElement).value);
    // console.log('Selected sectorID:', selectedSectorId);
    this.article.SectorPid = selectedSectorId;
    // this.articleService
    //   .getSubsectorByID(selectedSectorId)
    //   .subscribe((result) => {
    //     console.log(result.data);
    //     this.subSectorArray = result.data;
    //   });

    // const selectedJournalist = this.Journalistarray.find(
    //   (j: any) => j.JourID === journalistId
    // );

    // console.log(selectedJournalist);

    // if (selectedJournalist) {
    //   const isDuplicate = this.journalistNameArray.some(
    //     (journalist) => journalist.JournalistID === journalistId
    //   );

    //   if (!isDuplicate) {
    //     this.journalistNameArray.push({
    //       JournalistID: selectedJournalist.JourID,
    //       Fname: selectedJournalist.Fname,
    //       Lname: selectedJournalist.Lname,
    //     });

    //     // console.log(this.journalistNameArray); // For debugging to see the updated array
    //   }
    // }
    // this.BylineControl.reset(); // Reset the input field
  }

  saveJournalistEdit(): void {
    if (
      this.selectedJournalistId !== null &&
      this.selectedJournalistName.trim() !== ''
    ) {
      // Split the full name into first and last names
      const [Fname, Lname] = this.selectedJournalistName.split(' ');

      // Ensure that Fname and Lname are properly assigned
      const firstName = Fname || '';
      const lastName = Lname || '';

      // Find the journalist to update from the journalistNameArray
      const journalistToUpdate = this.journalistNameArray.find(
        (journalist) => journalist.JournalistID === this.selectedJournalistId
      );

      if (journalistToUpdate) {
        // Update the journalist's name locally in the array
        journalistToUpdate.Fname = firstName;
        journalistToUpdate.Lname = lastName;

        // Make the API call to update the journalist's details in the database
        this.articleService
          .editJour(this.selectedJournalistId, firstName, lastName)
          .subscribe(
            (response) => {
              // Handle the success response (optional)
              // console.log('Journalist updated successfully', response);
              // Optionally, you can update the UI or show a success message
            },
            (error) => {
              // Handle the error response (optional)
              console.error('Error updating journalist', error);

              // Optionally, you can show an error message
            }
          );

        // Reset the selected journalist information after the update
        this.selectedJournalistId = null;
        this.selectedJournalistName = '';
      } else {
        // console.log('Journalist not found in the array');
      }
    } else {
      // console.log('Invalid journalist data');
    }
  }

  // viewArticle() {
  //   // this.isModalLoading = true;
  //   if (this.page_Number.length > 0) {
  //     // console.log(this.article);
  //     const imagedirectory =
  //       this.article.imageDirectory || this.page_Number[0].imageDirectory;
  //     const Image_name =
  //       this.article.Image_Name || this.page_Number[0].Image_Name;
  //     const baseUrl = 'https://myimpact.in/backup';
  //     const url = `${baseUrl}/${imagedirectory}/${Image_name}`;
  //     // const url = `${baseUrl}/${page.imageDirectory}/${page.Image_Name}`;
  //     // window.open(url, '_blank');
  //     // this.imageURL = url;
  //     this.imageSrc = "https://myimpact.in/irisprocess/testingimageupdate/images/123-20250125-21-Economy_8.jpg";
  //     console.log(this.imageSrc);
  //     // this.isModalLoading=false;
  //     this.cdr.detectChanges();  // This forces the UI to update

  //     this.isUploadedImage = false
  //   } else {
  //     console.error('No page number data available');
  //     this.isModalLoading=false;
  //   }
  // }

  // viewArticle() {
  //   this.isModalLoading = true;

  //   if (this.page_Number.length > 0) {
  //     const imagedirectory =
  //       this.article.imageDirectory || this.page_Number[0].imageDirectory;
  //     const Image_name =
  //       this.article.Image_Name || this.page_Number[0].Image_Name;
  //     const baseUrl = 'https://myimpact.in/backup';
  //     const url = `${baseUrl}/${imagedirectory}/${Image_name}`;

  //     // Simulate the image source update (example)
  //     this.zone.run(() => {
  //       this.imageSrc = "https://myimpact.in/irisprocess/testingimageupdate/images/123-20250125-21-Economy_8.jpg";
  //       console.log(this.imageSrc);
  //       this.isModalLoading = false;
  //       this.isUploadedImage = false;
  //       this.cdr.detectChanges();  // Ensure the view is updated

  //     });

  //   } else {
  //     console.error('No page number data available');
  //     this.isModalLoading = false;
  //     this.cdr.detectChanges();  // Ensure the view is updated if there's an error
  //   }
  // }

  viewPDF() {
    if (this.page_Number.length > 0) {
      const baseUrl = 'https://myimpact.in/clip_admin.php';
      const url = `${baseUrl}?id=${this.page_Number[0].md5id}`;
      // const url = `${baseUrl}/${page.imageDirectory}/${page.Image_Name}`;
      window.open(url, '_blank');
    } else {
      console.error('No page number data available');
    }
  }

  getTextOnPageNumber(pageNumber: string) {
    this.isLoading = true;
    // console.log(pageNumber);
    // this.pageNumber = pageNumber

    // Find the full text for the selected page number
    const selectedPage = this.page_Number.find(
      (page) => page.pageNumber === pageNumber
    );
    if (selectedPage) {
      this.highlightedText = this.highlightExistingKeywords(
        selectedPage.fullText
      );
      this.article.full_text = selectedPage.fullText;
      this.article.Page_Number = selectedPage.pageNumber;
      this.article.pagename = selectedPage.pageName;
      this.article.imageDirectory = selectedPage.imageDirectory;
      this.article.Image_Name = selectedPage.Image_Name;
      this.article.htmlDirectory = selectedPage.htmlDirectory;
      this.article.html = selectedPage.html;
      (this.article.start_acq_time = selectedPage.start_acq_time),
        (this.article.end_acq_time = selectedPage.end_acq_time);
      this.newPageName = this.article.pagename;
      this.newPageNumber = this.article.Page_Number;
      // console.log(this.article.full_text);
      this.getTimeTaken(this.article.start_acq_time, this.article.end_acq_time);
    }
    // this.baseUrl = 'https://databank.irmplservices.com/backup';
    this.baseUrl = 'https://myimpact.in/backup';

    this.url = `${this.baseUrl}/${this.article.imageDirectory}/${this.article.Image_Name}`;
    // console.log(this.url);
    this.isLoading = false;
  }

  filterPublications(value: string) {
    if (!value.trim()) {
      return of([]);
      // return of(this.publications);
    }

    const inputValue = value.toLowerCase().trim();
    const filtered = this.publications.filter((publication) =>
      `${publication.PublicationTitle} ${publication.Edition}`
        .toLowerCase()
        .includes(inputValue)
    );
    return of(filtered);
  }

  filterTitle() {
    this.isLoading = true;
    const inputValue = this.titleControl.value?.toLowerCase() || '';
    // this.getPublications()
    if (inputValue !== '') {
      this.filterArticleTitles = this.articleTitles.filter((article) =>
        article.ArticleTitle.toLowerCase().includes(inputValue)
      );
      this.isLoading = false;
    } else {
      this.filterArticleTitles = this.articleTitles;
      this.isLoading = false;
    }
    // this.isLoading = true
    //  else {
    //   this.filterArticleTitles = [];
    //    this.isLoading = false;
    // }

    // console.log(this.filterArticleTitles);
  }

  getTimeTaken(start_acq_time: Date, end_acq_time: Date) {
    const start_time = new Date(start_acq_time);
    const end_time = new Date(end_acq_time);

    // Calculate the difference in milliseconds
    const timeDifferenceInMilliseconds =
      end_time.getTime() - start_time.getTime();
    // console.log('timeDifferenceInMilliseconds: ', timeDifferenceInMilliseconds);

    // Convert milliseconds to seconds
    const millisecondsInASecond = 1000;
    const totalSeconds = timeDifferenceInMilliseconds / millisecondsInASecond;

    // Convert total seconds to minutes and seconds
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    // Preserve exact decimal value
    const actualTime = minutes + seconds / 60;
    const formattedActualTime = actualTime.toString().split('.');

    if (formattedActualTime[1]) {
      // Ensure the decimal part is exactly one digit
      formattedActualTime[1] = formattedActualTime[1].substring(0, 1);
    } else {
      // If no decimal part exists, add ".0"
      formattedActualTime[1] = '0';
    }

    this.timeTaken = `${formattedActualTime[0]}.${formattedActualTime[1]}`;
    // console.log(this.timeTaken);
  }

  ocr() {
    this.isLoading = true;
    this.additionalKeyowrds = [];
    // console.log(this.url);

    this.destroy$.next(); // Ensure this is called to cancel previous subscriptions
    try {
      this.articleService
        .getOcrText(this.url)
        .pipe(takeUntil(this.destroy$)) // Cancel subscription when destroy$ emits
        .subscribe(
          (result) => {
            if (result) {
              this.isLoading = false;
              // console.log(result.extracted_text);
              this.highlightedText = result.extracted_text;

              // Process the extracted text
              let processedText = result.extracted_text
                .replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2') // Merge hyphenated words
                .replace(/(?<!\n)\n(?!\n)/g, ' ') // Keep single newlines as single newline
                .replace(/\n\n/g, '\n') // Replace double newlines with single newline
                .replace(/'/g, "\\'"); // Escape single quotes

              let processedText1 = result.extracted_text
                .replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2')
                .replace(/(?<!\n)\n(?!\n)/g, ' ') // Keep single newlines as single newline
                .replace(/\n\n/g, '\n'); // Replace double newlines with single newline

              let userid = '';
              // console.log(processedText);

              // Default to 'rsharma' if UserID is not defined
              if (this.UserID !== '' && this.UserID !== undefined) {
                userid = this.UserID;
              } else {
                userid = 'rsharma';
              }
              const pubid = this.article.PubID;

              // If processedText is available, get additional keywords
              if (processedText) {
                this.articleService
                  .getAddKeywords(userid, processedText, pubid)
                  .subscribe(
                    (result) => {
                      result.forEach((element: any) => {
                        // console.log(element.Keyword);
                        // Check if the keyword already exists in the array
                        const exists = this.keywords.some(
                          (keyword) => keyword.keyword === element.Keyword
                        );
                        if (!exists) {
                          this.additionalKeyowrds.push({
                            keyword: element.Keyword,
                          });
                        }
                      });
                      this.highlightedText =
                        this.highlightKeywords(processedText1);
                      // console.log(this.highlightedText);
                      this.isLoading = false; // Set loading to false when done
                    },
                    (error) => {
                      // Handle error from getAddKeywords
                      console.log('Error fetching keywords:', error);
                      this.isLoading = false; // Ensure loading is set to false
                      this.destroy$.next(); // Ensure proper cleanup
                    }
                  );
              }
            } else {
              console.log('Error fetching OCR result');
              this.isLoading = false;
              this.destroy$.next();
            }
          },
          (error) => {
            // Handle error from OCR API request
            console.log('Error fetching OCR result:', error);
            this.isLoading = false; // Ensure loading is set to false
            this.destroy$.next(); // Ensure proper cleanup
          }
        );
    } catch (error) {
      // Catch any other errors during the OCR process
      console.log('Error in OCR process:', error);
      this.isLoading = false; // Ensure loading is set to false
      this.destroy$.next(); // Ensure proper cleanup
    }
  }

  highlightKeywords(text: string) {
    // text = text.replace(/'s\b/g, ''); // Remove possessive 's

    let highlightedText = text;
    // console.log('Before highlighting: ', highlightedText);

    // Highlight additional keywords first
    this.additionalKeyowrds.forEach((keyword) => {
      // const regex = new RegExp(
      //   `\\b(${keyword.keyword})(?=\\b|[\\s.,;!?])`,
      //   'gi'
      // );
      const regex = new RegExp(`\\b(${keyword.keyword})\\b`, 'gi');

      highlightedText = highlightedText.replace(
        regex,
        `<span class="highlight-blue">$1</span>` // Use class instead of inline style
      );
    });

    // Highlight main keywords with inline CSS
    this.keywords.forEach((keyword) => {
      // const regex = new RegExp(
      //   `\\b(${keyword.keyword})(?=\\b|[\\s.,;!?])`,
      //   'gi'
      // );
      const regex = new RegExp(`\\b(${keyword.keyword})\\b`, 'gi');

      highlightedText = highlightedText.replace(
        regex,
        `<span class="highlight-yellow">$1</span>` // Use class instead of inline style
      );
    });

    highlightedText = highlightedText.replace(/<span[^>]*><\/span>/g, ''); // Remove empty spans

    // console.log('After highlighting: ', highlightedText);

    return this.sanitizer.bypassSecurityTrustHtml(highlightedText);
  }

  highlightExistingKeywords(text: string) {
    let highlightedText = text;
    // Highlight main keywords with inline CSS
    this.keywords.forEach((keyword) => {
      const regex = new RegExp(`(\\b${keyword.keyword}\\b)`, 'gi');
      highlightedText = highlightedText.replace(
        regex,
        `<span style="background-color: yellow; font-weight: bold;">$1</span>`
      );
    });

    highlightedText = highlightedText.replace(/(<span[^>]*>)+<\/span>/g, ''); // Remove empty spans

    // console.log("After highlighting: ", highlightedText);

    return this.sanitizer.bypassSecurityTrustHtml(highlightedText);
  }

  onTitleChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.article.ArticleTitle = input.value;
    // console.log(this.article.ArticleTitle);

    // this.updateTitle();
  }

  onSubTitleChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.article.Sub_Title = input.value;
    // console.log(this.article.Sub_Title);
  }

  editCheckBox(event: Event) {
    const input = event.target as HTMLInputElement;
    switch (input.id) {
      case 'inlineCheckbox1':
        this.article.IsPremium = input.checked ? 'Y' : ' ';
        break;
      case 'inlineCheckbox2':
        this.article.IsPhoto = input.checked ? 'Y' : ' ';
        break;
      case 'inlineCheckbox3':
        this.article.IsColor = input.checked ? 'Y' : ' ';
        break;
      default:
        console.warn('Unexpected checkbox ID');
    }
  }

  editPageNumber(event: Event) {
    const input = event.target as HTMLInputElement;
    this.newPageNumber = input.value;
    // console.log(this.newPageNumber);
  }

  onJourChange(event: Event) {
    this.isLoading = true;
    const inputValue = this.BylineControl.value?.toLowerCase() || '';
    const isEnterKey = event instanceof KeyboardEvent && event.key === 'Enter';
    // console.log(inputValue);

    // console.log(isEnterKey);
    if (inputValue && isEnterKey) {
      this.addNewJourName();
    }

    // this.isLoading = false;
  }

  addNewJourName() {
    const inputValue = this.BylineControl.value?.toLowerCase() || '';
    const names = inputValue
      .trim()
      .split(' ')
      .map((name: any) => name.trim());
    this.jourFname = names[0];
    this.jourLname = names.length > 1 ? names.slice(1).join(' ') : '';

    this.selectedJourId = 0;
    // console.log(this.selectedJourId);
    // console.log(this.jourFname);
    // console.log(this.jourLname);

    this.articleService
      .addJourId(
        this.selectedArticleId,
        this.selectedJourId,
        this.jourFname,
        this.jourLname
      )
      .subscribe((response: any) => {
        // console.log(response);
        // this.getJournalists()
        // console.log(typeof(results));
        const results = response.results;
        // console.log(results[0].JourID);
        // console.log(results[0].Fname);
        // console.log(results[0].Lname);

        if (results && results.length > 0) {
          // console.log('Pushing data into array:', results[0]);

          // Check for duplicates based on JournalistID, Fname, and Lname
          const isDuplicate = this.journalistNameArray.some(
            (journalist) =>
              journalist.JournalistID === results[0].JourID &&
              journalist.Fname === results[0].Fname &&
              journalist.Lname === results[0].Lname
          );

          // Only add to the array if it's not a duplicate
          if (!isDuplicate) {
            this.journalistNameArray = [
              ...this.journalistNameArray,
              {
                JournalistID: results[0].JourID,
                Fname: results[0].Fname,
                Lname: results[0].Lname,
              },
            ];
            // console.log('Added new journalist to array:', results[0]);
          }
        } else {
          console.log('No results to push');
        }
        this.BylineControl.reset(); // Reset the input field
        this.filterJournalistarray = [];
        // console.log('Updated journalistNamesArray:', this.journalistNameArray);
      });
  }

  onPageNameChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.newPageName = input.value;
    // console.log(this.newPageName);
  }

  async saveArticleJournalists(): Promise<void> {
    const journalistsToAdd = this.journalistNameArray.map(
      (journalist) => journalist.JournalistID
    );

    for (const journalistID of journalistsToAdd) {
      try {
        const response: any = await this.articleService
          .checkArticleJournalist(this.selectedArticleId, journalistID)
          .toPromise();

        if (response.exists) {
          // console.log(
          //   `Journalist ${journalistID} already exists for this article.`
          // );
        } else {
          await this.articleService
            .addArticleJournalist(this.selectedArticleId, journalistID)
            .toPromise();
          // console.log(`Journalist ${journalistID} added to article.`);
        }
      } catch (error) {
        console.error(`Error for JournalistID ${journalistID}:`, error);
      }
    }

    console.log('All operations completed');
  }

  async save() {
    this.isLoading = true;
    try {
      // await this.checkUser();
      console.log(this.UserID);
      if (
        this.UserID.trim() !== '' &&
        this.UserID !== undefined &&
        this.UserID !== null
      ) {
        try {
          await this.updateTitle();
          await this.updatePage();
          await this.saveArticleJournalists();
          this.closeModal();
          // console.log('User ID is valid. Save process completed successfully.');
          this.getTotalArticles(this.selectedDate);
          this.getFullArticle();
          this.isLoading = false;
        } catch (saveError) {
          console.error('Error during save process:', saveError);
          alert('An error occurred while saving the data. Please try again.');
          this.closeModal();
          this.isLoading = false;
        }
      } else {
        this.closeModal();
        window.location.href =
          'https://databank.irmplservices.com/databank/login.php';
        console.log('User ID is invalid or empty.'); // Debugging message if UserID is invalid or empty
        this.isLoading = false;
      }
    } catch (error) {
      console.error('unexpected error:', error);
      // Optionally display a user-friendly message
      alert('An error occurred. Please try again.');
      this.isLoading = false;
    }
  }

  removeJournalist(journalistId: number): void {
    this.showRemoveModal = true;
    this.removeJournalistId = journalistId;
  }

  async remove() {
    this.isLoading = true;
    try {
      // Wait for UserID to be fetched
      // await this.checkUser();
      console.log(this.UserID);

      // Ensure the UserID is valid
      if (
        this.UserID.trim() !== '' &&
        this.UserID !== undefined &&
        this.UserID !== null
      ) {
        // Wait for the removal of the journalist
        await this.articleService
          .removeArticleJournalist(
            this.selectedArticleId,
            this.removeJournalistId
          )
          .toPromise();

        // Filter out the removed journalist from the list
        this.journalistNameArray = this.journalistNameArray.filter(
          (journalist) => journalist.JournalistID !== this.removeJournalistId
        );

        // Close the modal
        this.showRemoveModal = false;
        // console.log('Journalist removed successfully.');
        this.isLoading = false;
      } else {
        this.closeModal();
        window.location.href =
          'https://databank.irmplservices.com/databank/login.php';
        // console.log('User ID is invalid or empty.');
        this.isLoading = false;
      }
    } catch (error) {
      console.error('Error during remove operation:', error);
      this.isLoading = false;
      // Optionally show an error message to the user
    }
  }

  async notSave() {
    try {
      await this.getFullArticle();
      this.closeModal();
    } catch (error) {
      console.error('Error during not save process:', error);
    }
  }

  openModal() {
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.showRemoveModal = false;
  }

  updateTitle(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.articleService
        .editArticle(
          this.selectedArticleId,
          this.article.ArticleTitle,
          this.article.Sub_Title,
          this.article.IsPremium,
          this.article.IsPhoto,
          this.article.IsColor,
          this.UserID,
          this.article.SectorPid
        )
        .subscribe(
          (result) => {
            // console.log(result);
            resolve(result);
          },
          (error) => reject(error)
        );
    });
  }

  updatePage(): Promise<any> {
    // console.log('full_text : ', this.article.full_text);

    return new Promise((resolve, reject) => {
      this.articleService
        .editPage(
          this.selectedArticleId,
          this.article.Page_Number,
          this.newPageNumber,
          this.newPageName,
          this.article.full_text
        )
        .subscribe(
          (result) => {
            // console.log(result);
            resolve(result);
          },
          (error) => reject(error)
        );
    });
  }

  copyToClipboard() {
    const textElement = document.getElementById('highlightedText');
    if (textElement) {
      const text = textElement.innerText; // Use innerText to get plain text
      // console.log(text);
      if (text) {
        this.fallbackCopy(text);
        this.isCopied = true;
        setTimeout(() => {
          this.isCopied = false; // Revert back to copy icon after 2 seconds
        }, 2000);
      } else {
        console.error('Failed to copy text');
      }
      // if (navigator.clipboard) {
      //   navigator.clipboard.writeText(text).then(
      //     () => {
      //       this.isCopied = true; // Change icon to checkmark
      //       setTimeout(() => {
      //         this.isCopied = false; // Revert back to copy icon after 2 seconds
      //       }, 2000);
      //     },
      //     (err) => {
      //       console.error('Failed to copy text: ', err);
      //     }
      //   );
      // } else {
      //   console.error('Clipboard API is not supported.');
      // }
    } else {
      console.warn('Text element not found');
    }
  }

  fallbackCopy(text: any) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      // console.log('Text copied to clipboard (fallback)');
    } catch (err) {
      console.error('Failed to copy text using fallback:', err);
    }
    document.body.removeChild(textarea);
  }

  checkUser(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.articleService.checkUser().subscribe(
        (result: any) => {
          if (result && result.UserId !== undefined && result.UserId !== null) {
            console.log('UserId exists:', result.UserId);
            this.UserID = result.UserId;
            resolve(); // Resolve the promise once UserID is set
          } else {
            console.log('UserId is not available');
            this.UserID = '';
            console.log(this.UserID);
            this.closeModal();
            reject('UserId is not available');  // Reject the promise if UserId is not found
            window.location.href =
              'https://databank.irmplservices.com/databank/login.php';
          }
        },
        (error) => {
          console.error('Error fetching UserId:', error);
          reject(error); // Reject the promise on error
        }
      );
    });
  }

  modalType: 'confirm' | 'success' = 'confirm';
  confirmationMessage: string = '';
  confirmationAction: () => void = () => {};

  triggerSaveConfirmation() {
    this.modalType = 'confirm'; // Set modal type
    this.confirmationMessage =
      'Are you sure you want to save the cropped image?';
    this.confirmationAction = () => this.saveCroppedImageToServer();
    this.showConfirmationModal();
  }

  triggerUploadConfirmation() {
    this.modalType = 'confirm'; // Set modal type
    this.confirmationMessage = 'Are you sure you want to upload a new image?';
    this.confirmationAction = () => this.triggerFileInput();
    this.showConfirmationModal();
  }

  showSuccessModal() {
    this.modalType = 'success'; // Set modal type
    this.confirmationMessage = 'Image saved successfully!';
    this.showConfirmationModal();
  }

  showConfirmationModal() {
    const modalElement = document.getElementById('confirmModal');
    const modalInstance = new bootstrap.Modal(modalElement);
    modalInstance.show();
  }

  confirmAction() {
    if (this.modalType === 'confirm' && this.confirmationAction) {
      this.confirmationAction();
    }
    // this.resetConfirmationState();
  }

  cancelConfirmation() {
    this.confirmationMessage = '';
    this.confirmationAction = () => {};

    // Call the existing reset functions to clean up the state
    this.resetCropper(); // Reset the cropper-related state
    this.resetSavedImage(); // Reset the saved image state

    // Optional: Reset other state variables if needed
    this.isModalLoading = false;
    this.isPreviewImage = false;
    this.isSaveImage = false;
  }

  triggerFileInput() {
    try {
      const fileInput = document.getElementById(
        'imageUpload'
      ) as HTMLInputElement;
      fileInput.value = ''; // Clear previous file selection
      fileInput.click(); // Open file picker
      // console.log("file open from file input");
    } catch (error) {
      console.error('Error triggering file input:', error);
      alert('An error occurred while triggering the file input.');
    }
  }

  onFileSelected(event: Event) {
    this.isModalLoading = true; // Show loading
    try {
      const input = event.target as HTMLInputElement;
      if (input.files && input.files.length > 0) {
        this.selectedFile = input.files[0];
        this.isPreviewMode = false;
        this.isUploadedImage = true;

        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imageSrc = e.target.result;
          // console.log("imageSrc: " + this.imageSrc);
          // console.log("cropped image: " + this.croppedImage);
          this.isUploadedImage = true;
          this.imageKey = Date.now().toString(); // Force re-rendering
          this.isSaveImage = true;
          // this.resetCropper(true);

          // ✅ Hide loading only after image is set
          this.isModalLoading = false;
        };

        reader.onerror = () => {
          console.error('Error reading file.');
          alert('An error occurred while reading the file.');
          this.isModalLoading = false;
        };

        reader.readAsDataURL(this.selectedFile); // Start reading the file
      } else {
        console.warn('No file selected.');
        alert('No file selected.');
        this.isModalLoading = false;
      }
    } catch (error) {
      console.error('Error reading file:', error);
      alert('An error occurred while reading the file.');
      this.isModalLoading = false;
    }
  }

  async loadImageFromUrl(imageUrl: string): Promise<boolean> {
    // console.log(`Requesting image: ${imageUrl}`);
    this.isModalLoading = true;
    try {
      const response = await this.articleService
        .getImageFromURL(imageUrl)
        .pipe(takeUntil(this.destroy$))
        .toPromise();
      // console.log("Fetched Response:", response);

      if (!response) throw new Error('Invalid response from server.');

      const blob = new Blob([response], { type: 'image/jpeg' });
      const generatedImageUrl = URL.createObjectURL(blob);

      const imageElement = document.getElementById(
        'imageElement'
      ) as HTMLImageElement;

      if (!imageElement) {
        console.warn('Image element no longer exists.');
        return false; // Exit if modal is closed before loading
      }

      imageElement.src = generatedImageUrl;
      // console.log("imageElement: " + imageElement);

      return new Promise<boolean>((resolve, reject) => {
        imageElement.onload = () => {
          // if (!imageElement) {
          //   console.warn("Image element removed before loading completed.");
          //   return;
          // }
          this.isModalLoading = false;
          resolve(true);
        };
        imageElement.onerror = (error) => {
          console.error('Error when loading image:', error);
          this.isModalLoading = false;
          alert('Error when loading image:');
          reject(false);
        };
      });
    } catch (error) {
      console.error('Error fetching the image:', error);
      this.isModalLoading = false;
      alert('Failed to load image.');
      return false;
    }
  }

  async enableCropping() {
    this.isModalLoading = true; // Show loader immediately when crop button is clicked
    setTimeout(async () => {
      // Ensures UI updates before processing starts
      try {
        // console.log(this.isUploadedImage);
        // console.log('load image from: ', this.imageSrc);
        if (!this.isUploadedImage) {
          const success = await this.loadImageFromUrl(this.imageSrc);
          if (!success) {
            alert('Image failed to load.');
            this.isModalLoading = false;
            return; // Stop execution if image fails to load
          }
          this.isUploadedImage = true;
          this.isSaveImage = false;

          if (!this.isCropEnabled) {
            const imageElement = this.imageElement.nativeElement;
            this.initializeCropper(imageElement);
          }
        } else {
          if (!this.isCropEnabled) {
            const imageElement = this.imageElement.nativeElement;
            // console.log('Initializing cropper for the first time');
            this.isSaveImage = false;
            this.initializeCropper(imageElement);
          } else if (this.cropper) {
            if (this.isPreviewMode) {
              // console.log('Reinitializing cropper for re-cropping');
              this.reinitializeCropper(this.cropper);
            } else {
              // console.log('Generating cropped preview');
              this.generatePreview();
              this.cropper.destroy();
              this.cropper = null;
              this.isCropEnabled = false;
              this.isPreviewMode = true;
              this.isPreviewImage = true;
            }
          }
        }
      } catch (error) {
        console.error('Error in loading image', error);
        alert('An error occurred while enabling cropping.');
      } finally {
        this.isModalLoading = false; // Hide loader once cropping is enabled
      }
    }, 50); // Delay ensures loader is shown before heavy processing starts
  }

  initializeCropper(imageElement: HTMLImageElement) {
    // console.log('Initializing cropper for the first time on url');
    try {
      this.cropper = new Cropper(imageElement, {
        viewMode: 2,
        zoomable: true,
        scalable: true,
        movable: true,
        dragMode: 'crop', // Allows manual selection
        autoCrop: false, // Prevents auto-cropping
        autoCropArea: 0, // Ensures manual crop selection
        cropBoxMovable: true, // Allow moving crop box
        cropBoxResizable: true, // Allow resizing crop box
      });

      this.isCropEnabled = true;
      this.isPreviewMode = false;
    } catch (error) {
      console.error('Error initializing cropper:', error);
      alert('An error occurred while initializing the cropper.');
    } finally {
      this.isModalLoading = false;
    }
  }

  reinitializeCropper(crpper: any) {
    try {
      crpper.destroy();
      const imageElement = this.imageElement.nativeElement;
      this.cropper = new Cropper(imageElement, {
        viewMode: 2,
      });
      this.isPreviewMode = false;
    } catch (error) {
      console.error('Error reinitializing cropper:', error);
      alert('An error occurred while reinitializing the cropper.');
    } finally {
      this.isModalLoading = false;
    }
  }

  generatePreview() {
    this.isModalLoading = true;
    // console.log('generatePreview');
    try {
      if (this.cropper) {
        const canvas = this.cropper.getCroppedCanvas();
        this.imageSrc = canvas.toDataURL('image/jpeg');
        this.isSaveImage = true;
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      alert('An error occurred while generating the preview.');
    } finally {
      this.isModalLoading = false;
    }
  }

  // async saveCroppedImageToServer() {
  //   this.isLoading = true;
  //   try {
  //     let blob: Blob;
  //     let file: File;

  //     if (this.croppedImage) {
  //       // Use cropped image
  //       blob = this.dataURLToBlob(this.croppedImage);
  //     } else {
  //       // Use original image if no cropping was done
  //       blob = this.dataURLToBlob(this.imageSrc);
  //     }

  //     // if (this.croppedImage) {
  //     //   const blob = this.dataURLToBlob(this.croppedImage);
  //     //   const file = new File([blob], "cropped-image.jpg", { type: "image/jpeg" });

  //     // } else {
  //     //   const blob = this.dataURLToBlob(this.imageSrc);
  //        file = new File([blob], "cropped-image.jpg", { type: "image/jpeg" });

  //     // }

  //       const formData = new FormData();
  //       formData.append("image", file);

  //       const response = await this.articleService.uploadArticleImage(formData).toPromise();
  //       console.log("Image replaced successfully on the server.", response);

  //       this.ngZone.run(() => {
  //         this.imageSrc = `${this.imageSrc}?${Date.now()}`;
  //         this.resetSavedImage(true);
  //         // alert("Image saved successfully!");
  //         this.viewArticle();
  //       });

  //       const text = await this.articleService.getOcrText("https://myimpact.in/irisprocess/testingimageupdate/images/123-20250125-21-Economy_8.jpg").toPromise();
  //       console.log("Text extracted successfully.", text);

  //       const result = await this.articleService.replaceText(text.extracted_text).toPromise();
  //       console.log(result);

  //       this.showSuccessModal();

  //       // this.imageSrc = `${this.imageSrc}?${Date.now()}`;
  //       // // this.imageSrc = { ...this.imageSrc };

  //       // this.resetSavedImage(true);

  //       // alert("Image saved successfully!");
  //       // this.viewArticle();
  //     // } else {
  //     //   alert("Please crop the image before saving.");
  //     // }
  //   } catch (error) {
  //     console.error("Error replacing the image on the server:", error);
  //     alert("Failed to replace the image.");
  //   } finally {
  //     this.isLoading = false;
  //   }
  // }

  // async saveCroppedImageToServer() {
  //   this.isLoading = true;
  //   try {
  //     let blob: Blob;
  //     let file: File;

  //     // Use cropped image if available, otherwise use original image
  //     if (this.croppedImage) {
  //       blob = this.dataURLToBlob(this.croppedImage);
  //     } else {
  //       blob = this.dataURLToBlob(this.imageSrc);
  //     }

  //     file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
  //     const imageReplacePath = "/backup/irisprocess/testingimageupdate/images/123-20250125-21-Economy_8.jpg"
  //     const textReplacePath = "/backup/irisprocess/testingimageupdate/text/123-20250125-21-Economy_8.txt"
  //     const htmlReplacePath = "/backup/irisprocess/testingimageupdate/html/123-20250125-21-Economy_8.html"

  //     // Prepare form data to upload the image
  //     const formData = new FormData();
  //     formData.append('imagePath', imageReplacePath);
  //     formData.append('image', file);

  //     // Upload the image
  //     const response = await this.articleService
  //       .uploadArticleImage(formData)
  //       .toPromise();
  //     console.log('Image replaced successfully on the server.', response);

  //     this.ngZone.run(() => {
  //       // Update the image source to reflect the uploaded image
  //       this.imageSrc = `${this.imageSrc}?${Date.now()}`;
  //       this.resetSavedImage(true);
  //       // Optionally reload the article or refresh UI
  //       this.viewArticle();
  //     });

  //     // Extract text using OCR after the image upload
  //     const text = await this.articleService
  //       .getOcrText(
  //         'https://myimpact.in/irisprocess/testingimageupdate/images/123-20250125-21-Economy_8.jpg'
  //       )
  //       .toPromise();
  //     console.log('Text extracted successfully.', text);

  //     // Now replace the text on the server
  //     // this.articleService.replaceText(text.extracted_text).subscribe(
  //     //   (response) => {
  //     //     console.log('Text replaced successfully.', response);
  //     //   },
  //     //   (error) => {
  //     //     console.error('Error replacing text:', error);
  //     //     console.log('Raw response:', error.error); // Log raw response
  //     //   }
  //     // );
  //     const textResponse = this.articleService.replaceText(text.extracted_text, textReplacePath).toPromise();
  //     console.log('Text replaced successfully.', textResponse);

  //     // Now replace the HTML on the server
  //     const htmlResponse =  this.articleService.replaceHTML(text.extracted_text, htmlReplacePath).toPromise();
  //     console.log('HTML replaced successfully.', htmlResponse);

  //     this.highlightedText = text.extracted_text
  //       .replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2') // Merge hyphenated words
  //       .replace(/(?<!\n)\n(?!\n)/g, ' ') // Keep single newlines as single newline
  //       .replace(/\n\n/g, '\n') // Replace double newlines with single newline
  //       // .replace(/'/g, "\\'"); // Escape single quotes
  //     // console.log(this.highlightedText);

  //     this.article.full_text = this.highlightedText;
  //     this.highlightExistingKeywords(this.article.full_text);
  //     // this.highlightedText = text.extracted_text
  //     // Show success modal or alert
  //     this.showSuccessModal();
  //   } catch (error) {
  //     console.error('Error replacing the image on the server:', error);
  //     alert('Failed to replace the image.');
  //   } finally {
  //     this.isLoading = false;
  //   }
  // }

  async saveCroppedImageToServer() {
    this.isLoading = true;
    try {
      let blob: Blob;
      let file: File;

      // Use cropped image if available, otherwise use original image
      if (this.croppedImage) {
        blob = this.dataURLToBlob(this.croppedImage);
      } else {
        blob = this.dataURLToBlob(this.imageSrc);
      }

      file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });

      // const imageReplacePath = "/backup/irisprocess/testingimageupdate/images/123-20250125-21-Economy_8.jpg";
      // const imageReplacePath = this.url;
      const imageReplacePath = this.serverImageURL;

      // console.log('image replace path: ' + imageReplacePath);

      // const textReplacePath = "/backup/irisprocess/testingimageupdate/text/123-20250125-21-Economy_8.txt";
      // const htmlReplacePath = "/backup/irisprocess/testingimageupdate/html/123-20250125-21-Economy_8.html";
      // const htmlReplacePath = this.htmlURL;
      const htmlReplacePath = this.serverHTMLurl;

      // console.log('html replace: ' + htmlReplacePath);

      // Prepare form data to upload the image
      const formData = new FormData();
      formData.append('imagePath', imageReplacePath);
      formData.append('image', file);

      // Upload the image
      let response;
      try {
        response = await this.articleService
          .uploadArticleImage(formData)
          .toPromise();
        if (response && typeof response === 'object') {
          if ('error' in response) {
            throw new Error(String(response.error)); // Convert to string to prevent TypeScript error
          }
          if ('success' in response && !response.success) {
            throw new Error('Upload failed: ' + JSON.stringify(response));
          }
        }

        console.log('✅ Image replaced successfully on the server.', response);
      } catch (error) {
        console.error('Error uploading image:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        alert('Failed to replace the image on the server: ' + errorMessage);
        return; // Stop execution if image upload fails
      }

      this.ngZone.run(() => {
        this.imageSrc = `${this.url}?${Date.now()}`;
        // this.resetSavedImage(true);
        // this.viewArticle();
      });

      // Extract text using OCR after the image upload
      let text;
      try {
        text = await this.articleService
          .getOcrText(imageReplacePath)
          .toPromise();
        if (!text || !text.extracted_text) {
          throw new Error('OCR extraction failed');
        }
        console.log('✅ Text extracted successfully.', text);
      } catch (error) {
        console.error('Error extracting text with OCR:', error);
        alert('Failed to extract text from the image.');
        return; // Stop execution if OCR fails
      }

      // Replace text on the server
      // try {
      //   const textResponse = await this.articleService.replaceText(text.extracted_text, textReplacePath).toPromise();
      //   // console.log('✅ Text replaced successfully.', textResponse);
      // } catch (error) {
      //   console.error('Error replacing text:', error);
      //   alert('Failed to replace text on the server.');
      //   return; // Stop execution if text replacement fails
      // }

      // Replace HTML on the server
      try {
        const htmlResponse = await this.articleService
          .replaceHTML(text.extracted_text, htmlReplacePath)
          .toPromise();
        if (htmlResponse && typeof htmlResponse === 'object') {
          if ('error' in htmlResponse) {
            throw new Error('HTML replacement failed: ' + htmlResponse.error); // Throws error
          }
          if ('success' in htmlResponse && !htmlResponse.success) {
            throw new Error('HTML replacement failed.'); // Throws error
          }
        }

        console.log('HTML replaced successfully.', htmlResponse);
      } catch (error) {
        console.error('Error replacing HTML:', error);
        alert('Failed to replace HTML on the server.');
        return; // Stop execution if HTML replacement fails
      }

      // Process and display extracted text
      this.highlightedText = text.extracted_text
        .replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2') // Merge hyphenated words
        .replace(/(?<!\n)\n(?!\n)/g, ' ') // Keep single newlines as single newline
        .replace(/\n\n/g, '\n'); // Replace double newlines with single newline

      this.article.full_text = this.highlightedText;
      // this.highlightExistingKeywords(this.article.full_text);

      // Show success modal
      this.showSuccessModal();
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred while processing the image.');
    } finally {
      this.isLoading = false; // Stop loading indicator in any case
    }
  }

  // handleSpecialCharacters(text: string): string {
  //   return text
  //     .replace(/â€¢/g, "•")
  //     .replace(/â€”/g, "—")
  //     .replace(/â€“/g, "–")
  //     .replace(/â€œ/g, "“")
  //     .replace(/â€˜/g, "‘")
  //     .replace(/â€™/g, "’")
  //     .replace(/â€/g, "”")
  //     .replace(/â€¦/g, "…")
  //     .replace(/Â°/g, "°")
  //     .replace(/â€“/g, "–")
  //     .replace(/â‚¬/g, "€")
  //     .replace(/\*/g, "'")
  //     .replace(/ï¿½/g, "'");
  // }

  // // Utility to handle line breaks and formatting
  // handleTextFormatting(text: string): string {
  //   return text
  //     .replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2') // Merge hyphenated words
  //     .replace(/(?<!\n)\n(?!\n)/g, ' ') // Keep single newlines as single newline
  //     .replace(/\n\n/g, '\n') // Replace double newlines with single newline
  //     .replace(/'/g, "\\'"); // Escape single quotes
  // }

  resetSavedImage(isSaved: boolean = false) {
    // console.log('resetSavedImage');
    try {
      this.isPreviewImage = false;

      if (this.cropper) {
        // console.log("Destroying cropper before closing modal.");
        this.cropper.destroy();
        this.cropper = null;
      }

      this.isCropEnabled = false;
      this.croppedImage = '';
      this.isPreviewMode = false;
    } catch (error) {
      console.error('Error resetting saved image:', error);
    }
  }

  dataURLToBlob(dataURL: string): Blob {
    const byteString = atob(dataURL.split(',')[1]);
    const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
    const buffer = new ArrayBuffer(byteString.length);
    const dataView = new Uint8Array(buffer);
    for (let i = 0; i < byteString.length; i++) {
      dataView[i] = byteString.charCodeAt(i);
    }
    return new Blob([buffer], { type: mimeString });
  }

  resetCropper(isSaved: boolean = false) {
    // this.isLoading = true;
    this.isModalLoading = true;
    // console.log('resetCropper');
    try {
      this.destroy$.next();
      this.isPreviewImage = false;

      if (this.cropper) {
        // console.log("Destroying cropper before closing modal.");
        this.cropper.destroy();
        this.cropper = null;
      }

      this.isCropEnabled = false;
      this.croppedImage = '';
      this.isPreviewMode = false;
      this.isSaveImage = false;
      this.isUploadedImage = false;
      // this.imageSrc = '';

      if (!isSaved) {
        // this.imageSrc = `https://myimpact.in/irisprocess/testingimageupdate/images/123-20250125-21-Economy_8.jpg?timestamp=${Date.now()}`;
        const url = `${this.url}?timestamp=${Date.now()}`; // Add timestamp to prevent caching
        // const url = `${this.url}`;

        // console.log("url: " + url);

        // this.imageSrc = ''; // Clear previous image to force reloading

        const img = new Image(); // Create a new image object
        img.src = url;

        img.onload = () => {
          this.ngZone.run(() => {
            // console.log("working fine...");
            this.imageSrc = url; // Set image when it's fully loaded
            this.isUploadedImage = false;
            this.isSaveImage = false;
            this.isModalLoading = false; // Hide loader
            // this.isLoading = false;
            this.cdr.detectChanges(); // Force UI update
          });
        };

        img.onerror = () => {
          this.ngZone.run(() => {
            console.error('Image failed to load.');
            this.isModalLoading = false; // Hide loader even if image fails
            // this.isLoading = false;
            this.cdr.detectChanges();
          });
        };
      } else {
        this.isModalLoading = false; // Hide loader
        // this.isLoading = false;
      }
    } catch (error) {
      console.error('Error resetting cropper:', error);
      this.isModalLoading = false;
      // this.isLoading = false;
    }
  }

  zoomIn() {
    this.isModalLoading = true;
    try {
      if (this.cropper) {
        this.cropper.zoom(0.1);
        this.isZoomEnabled = true;
      }
    } catch (error) {
      console.error('Error zooming in:', error);
      alert('An error occurred while zooming in.');
    } finally {
      this.isModalLoading = false;
    }
  }

  zoomOut() {
    this.isModalLoading = true;
    try {
      if (this.cropper) {
        this.cropper.zoom(-0.1);
        const data = this.cropper.getData();
        if (data.scaleX <= 1 && data.scaleY <= 1) {
          this.isZoomEnabled = false;
        }
      }
    } catch (error) {
      console.error('Error zooming out:', error);
      alert('An error occurred while zooming out.');
    } finally {
      this.isModalLoading = false;
    }
  }

  getTransformStyle() {
    return this.cropper ? {} : { transform: `scale(${this.zoomLevel})` };
  }

  // viewArticle() {
  //   this.isModalLoading=true
  //   if (this.page_Number.length > 0) {
  //     const imagedirectory = this.article.imageDirectory || this.page_Number[0].imageDirectory;
  //     const Image_name = this.article.Image_Name || this.page_Number[0].Image_Name;
  //     const baseUrl = 'https://myimpact.in/backup';
  //     const url = `${baseUrl}/${imagedirectory}/${Image_name}`;
  //     this.imageSrc = "https://myimpact.in/irisprocess/testingimageupdate/images/123-20250125-21-Economy_8.jpg";
  //     console.log(this.imageSrc);
  //     this.ngZone.run(() => { // Force UI update
  //       // this.cdr.detectChanges();
  //       this.imageSrc = `https://myimpact.in/irisprocess/testingimageupdate/images/123-20250125-21-Economy_8.jpg?timestamp=${Date.now()}`;

  //       this.isUploadedImage = false;
  //       this.isModalLoading=false;
  //     });
  //     // this.cdr.detectChanges();
  //     // this.isUploadedImage = false;
  //   } else {
  //     console.error('No page number data available');
  //   }
  // }

  viewArticle() {
    this.resetCropper();
    this.isModalLoading = true; // Show the loader
    console.log('View article');

    if (this.page_Number.length > 0) {
      const imagedirectory =
        this.article.imageDirectory || this.page_Number[0].imageDirectory;
      const Image_name =
        this.article.Image_Name || this.page_Number[0].Image_Name;
      const htmldirectory =
        this.article.htmldirectory || this.page_Number[0].htmlDirectory;
      const html = this.article.html || this.page_Number[0].html;
      const baseUrl = 'https://myimpact.in/backup';
      // const baseUrl = 'https://databank.irmplservices.com/backup';

      // const baseUrl = '/backup/printmonitor/data/';
      this.url = `${baseUrl}/${imagedirectory}/${Image_name}`;
      this.htmlURL = `${baseUrl}/${htmldirectory}/${html}.htm`;

      // console.log('Image url : ', this.url);
      // console.log('html url : ', this.htmlURL);

      this.serverImageURL = `/backup/printmonitor/data/${imagedirectory}/${Image_name}`;
      this.serverHTMLurl = `/backup/printmonitor/data/${htmldirectory}/${html}.htm`;

      // console.log("url: " + url);

      // this.imageSrc = ''; // Clear previous image to force reloading

      const img = new Image(); // Create a new image object
      img.src = `${this.url}?timestamp=${Date.now()}`;
      // img.src = `${this.url}?timestamp=${Date.now()}`; // Add timestamp here directly

      img.onload = () => {
        this.ngZone.run(() => {
          // console.log("working fine...");
          // this.imageSrc = this.url; // Set image when it's fully loaded
          this.imageSrc = img.src; // Set;
          this.isUploadedImage = false;
          this.isSaveImage = false;
          this.isModalLoading = false; // Hide loader
          this.cdr.detectChanges(); // Force UI update
        });
      };

      img.onerror = () => {
        this.ngZone.run(() => {
          console.error('Image failed to load.');
          this.isModalLoading = false; // Hide loader even if image fails
          this.cdr.detectChanges();
        });
      };
    } else {
      console.error('No page number data available');
      this.isModalLoading = false; // Hide loader
    }
  }

  eraseSelectedArea() {
    try {
      // console.log("erase selected areaa..");
      
      if (!this.cropper) return;

      const imageElement = this.imageElement.nativeElement as HTMLImageElement;
  
      // Get crop box area from Cropper
      const cropBox = this.cropper.getCropBoxData();
      const canvasData = this.cropper.getCanvasData();
      // console.log("CropBox : ", cropBox);
      // console.log("canvasData : ", canvasData);

      const scaleX = imageElement.naturalWidth / canvasData.width;
      const scaleY = imageElement.naturalHeight / canvasData.height;
  
      // Adjust coordinates to match original image resolution
      const eraseRect = {
        x: (cropBox.left - canvasData.left) * scaleX,
        y: (cropBox.top - canvasData.top) * scaleY,
        width: cropBox.width * scaleX,
        height: cropBox.height * scaleY,
      };
  
      // Create a canvas and draw the original image
      const canvas = document.createElement('canvas');
      canvas.width = imageElement.naturalWidth;
      canvas.height = imageElement.naturalHeight;
      const ctx = canvas.getContext('2d');
  
      if (!ctx) throw new Error('Canvas context not supported.');
  
      // Draw full image
      ctx.drawImage(imageElement, 0, 0);
  
      // Erase selected area (transparent)
      // Erase the selected part (make it white instead of transparent)
      ctx.fillStyle = 'white';
      ctx.fillRect(eraseRect.x, eraseRect.y, eraseRect.width, eraseRect.height);
    
      // Convert back to image (dataURL)
      const resultDataURL = canvas.toDataURL('image/jpeg'); // use 'image/jpeg' if you don't need transparency
  
      // Update the <img> element
      this.cropper.destroy(); // remove cropper before setting new image
      this.cropper = null;
      this.isCropEnabled = false;
  
      this.imageSrc = resultDataURL; // updates the image with erased area
      this.isUploadedImage = true;
      this.isSaveImage = true;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error erasing area:', error);
      alert('Failed to erase selected area.');
    }
  }
  

  sendMail() {
    const to = ''; // Hardcoded email for testing
    const subject = `${this.selectedPublication.PublicationTitle} - ${
      this.selectedPublication.Edition
    } ${this.formatDateForMail(this.selectedDate)}`;

    // Extract keyword values and join them with long dashes
    const additionalKeywordsText =
      this.additionalKeyowrds.length > 0
        ? this.additionalKeyowrds.map((k) => k.keyword).join(' ,')
        : 'None';

    let body = `${this.selectedPublication.PublicationTitle} – ${
      this.selectedPublication.Edition
    } – ${this.formatDateForMail(this.selectedDate)}\n\n`;
    body += `${this.article.ArticleTitle}\n\n`;
    body += `Add keywords: \n\n`;
    body += `Remove keyword:`;

    // Encode email components
    const mailtoLink = `mailto:${to}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    // Open email client
    window.location.href = mailtoLink;
  }

  

  cancelCropping() {
    this.isModalLoading = true; // Show loader
    console.log('Cancelling cropping...');

    setTimeout(() => {
      this.isCropEnabled = false; // Disable cropping mode
      this.resetCropper(); // Reset cropping process
    }, 200); // Small delay to ensure UI updates
  }

  // zoom(event: WheelEvent) {
  //   event.preventDefault();
  //   const zoomFactor = event.deltaY < 0 ? 0.1 : -0.1;

  //   if (this.cropper) {
  //     const imageData = this.cropper.getImageData();
  //     const cropBoxData = this.cropper.getCropBoxData();
  //     const canvasData = this.cropper.getCanvasData();
  //     const currentZoom = imageData.scaleX;

  //     // Set a max/min zoom limit
  //     if ((currentZoom > 0.5 || zoomFactor > 0) && (currentZoom < 3 || zoomFactor < 0)) {
  //       this.cropper.zoom(zoomFactor);

  //       // Get new image and crop box data after zooming
  //       const newImageData = this.cropper.getImageData();
  //       const newCropBoxData = this.cropper.getCropBoxData();

  //       // Ensure crop box stays inside the image
  //       const adjustedLeft = Math.max(newCropBoxData.left, newImageData.left);
  //       const adjustedTop = Math.max(newCropBoxData.top, newImageData.top);
  //       const adjustedWidth = Math.min(newCropBoxData.width, newImageData.width);
  //       const adjustedHeight = Math.min(newCropBoxData.height, newImageData.height);

  //       this.cropper.setCropBoxData({
  //         left: adjustedLeft,
  //         top: adjustedTop,
  //         width: adjustedWidth,
  //         height: adjustedHeight
  //       });

  //       // Ensure canvas stays within bounds
  //       this.cropper.setCanvasData({
  //         left: Math.max(canvasData.left, 0),
  //         top: Math.max(canvasData.top, 0),
  //         width: canvasData.width,
  //         height: canvasData.height,
  //       });
  //     }
  //   }
  // }

  zoom(event: WheelEvent) {
    event.preventDefault();
    const zoomFactor = event.deltaY < 0 ? 0.1 : -0.1;

    if (this.cropper) {
      const imageDataBeforeZoom = this.cropper.getImageData();
      const cropBoxDataBeforeZoom = this.cropper.getCropBoxData();

      // Apply zoom
      this.cropper.zoom(zoomFactor);

      // Get updated image data after zoom
      const imageDataAfterZoom = this.cropper.getImageData();

      // Scale the crop box proportionally to maintain its position within the image
      const scaleX = imageDataAfterZoom.width / imageDataBeforeZoom.width;
      const scaleY = imageDataAfterZoom.height / imageDataBeforeZoom.height;

      const newWidth = Math.min(
        cropBoxDataBeforeZoom.width * scaleX,
        imageDataAfterZoom.width
      );
      const newHeight = Math.min(
        cropBoxDataBeforeZoom.height * scaleY,
        imageDataAfterZoom.height
      );

      const newLeft = Math.max(
        imageDataAfterZoom.left,
        Math.min(
          cropBoxDataBeforeZoom.left * scaleX,
          imageDataAfterZoom.left + imageDataAfterZoom.width - newWidth
        )
      );
      const newTop = Math.max(
        imageDataAfterZoom.top,
        Math.min(
          cropBoxDataBeforeZoom.top * scaleY,
          imageDataAfterZoom.top + imageDataAfterZoom.height - newHeight
        )
      );

      // Apply the adjusted crop box to ensure it stays within bounds
      this.cropper.setCropBoxData({
        left: newLeft,
        top: newTop,
        width: newWidth,
        height: newHeight,
      });
    }
  }

  copyArticleId(id: string) {
    if (!id) return;

    navigator.clipboard.writeText(id);
    this.isCopied = true;

    setTimeout(() => {
      this.isCopied = false;
    }, 2000);
  }
}

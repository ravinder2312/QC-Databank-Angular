import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ArticleService {
  // private apiUrl = 'http://localhost:3800';
  // private apiUrl = 'http://databank.irmplservices.com:3800';
  private apiUrl = 'https://databank.irmplservices.com/qc-module/';


  constructor(private httpClient: HttpClient) {}

  getFullTextByID(articleID: string): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}/getFullTextById`, {
      articleID,
    });
  }

  getPublications(): Observable<any> {
    return this.httpClient.get(this.apiUrl + '/getPublications');
  }

  getTotalArticles(
    pubdate: string,
    pub: string,
    edition: string,
    mode: string
  ): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}/getArticles`, {
      pubdate,
      pub,
      edition,
      mode
    });
  }

  getArticlesByPageNumber(
    pubdate: string,
    pub: string,
    edition: string,
    pageNumber: string,
    mode: string
  ): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}/getArticlesByPageNo`, {
      pubdate,
      pub,
      edition,
      pageNumber,
      mode
    });
  }

  editArticle(
    id: string,
    title: string,
    sub_title: string,
    isPremium: string,
    isPhoto: string,
    isColor: string,
    UserID: string,
    sectorPid: number
  ) {
    return this.httpClient.put<any>(`${this.apiUrl}/editArticle`, {
      id,
      title,
      sub_title,
      isPremium,
      isPhoto,
      isColor,
      UserID,
      sectorPid,
    });
  }

  editPage(
    id: string,
    old_page_number: string,
    new_page_number: string,
    page_name: string,
    full_text: string
  ) {
    return this.httpClient.put<any>(`${this.apiUrl}/editPage`, {
      id,
      old_page_number,
      new_page_number,
      page_name,
      full_text,
    });
  }

  editJour(jourId: number, fname: string, lname: string) {
    return this.httpClient.put<any>(`${this.apiUrl}/editJour`, {
      jourId,
      fname,
      lname,
    });
  }

  addJourId(id: string, jourId: number, fname: string, lname: string) {
    return this.httpClient.post<any>(`${this.apiUrl}/addJourId`, {
      id,
      jourId,
      fname,
      lname,
    });
  }

  checkArticleJournalist(articleId: string, journalistId: number) {
    return this.httpClient.post<any>(`${this.apiUrl}/checkArticleJournalist`, {
      articleId,
      journalistId,
    });
  }

  addArticleJournalist(articleId: string, journalistId: number) {
    return this.httpClient.post<any>(`${this.apiUrl}/addArticleJournalist`, {
      articleId,
      journalistId,
    });
  }

  removeArticleJournalist(articleId: string, journalistId: number) {
    const body = { articleId, journalistId };

    return this.httpClient.delete<any>(
      `${this.apiUrl}/removeArticleJournalist`,
      { body }
    );
  }

  // getOcrText(imageurl: string) {
  //   return this.httpClient.post<any>(`https://beta.myimpact.in:5400/ocr`, {
  //     imageurl,
  //   });
  // }

  getOcrText(imageurl: string) {
    return this.httpClient.post<any>(
      `https://databank.irmplservices.com/qc-ocr/ocr`,
      {
        imageurl,
      }
    );
    // return this.httpClient.post<any>(`https://192.168.248.54:5000/ocr`, {
    //   imageurl,
    // });
  }

  getFilterString(PrimarykeyID: number) {
    return this.httpClient.post<any>(`${this.apiUrl}/getFilterString`, {
      PrimarykeyID,
    });
  }

  getAddKeywords(userid: string, text: string, pubid: number) {
    return this.httpClient.post<any>(`${this.apiUrl}/additionalKeywords`, {
      userid,
      text,
      pubid,
    });
  }

  getJournalists() {
    return this.httpClient.get<any>(`${this.apiUrl}/getJournalists`);
  }

  getAllSectors() {
    return this.httpClient.get<any>(`${this.apiUrl}/getAllSector`);
  }

  getSubsectorByID(ID: number) {
    return this.httpClient.post<any>(`${this.apiUrl}/getSubsectorById`, { ID });
  }

  checkUser() {
    const url =
      'https://databank.irmplservices.com/databank/reader/userAuth.php';
    return this.httpClient.get(url);
  }

  uploadArticleImage(formData: FormData) {
    return this.httpClient.post(
      `https://myimpact.in/QCImageupdate/imagereplace.php`,
      formData
    );
  }

  //   replaceText(text: string) {
  //     return this.httpClient.post(
  //       `https://myimpact.in/QCImageupdate/textreplace.php`,
  //       { text: text }  // Sending text as an object with key 'text'
  //     );
  // }

  replaceText(text: string, textReplacePath: string) {
    return this.httpClient.post(
      'https://myimpact.in/QCImageupdate/textreplace.php',
      { text, textReplacePath }, // No need to stringify manually
      { headers: { 'Content-Type': 'application/json' }, responseType: 'json' }
    );
  }

  replaceHTML(text: string, htmlReplacePath: string) {
    return this.httpClient.post(
      'https://myimpact.in/QCImageupdate/htmlreplace.php',
      { text, htmlReplacePath }, // Send both text and path
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  getImageFromURL(imageUrl: string) {
    return this.httpClient.post(
      `${this.apiUrl}/getImageBase64`,
      { imageUrl },
      { responseType: 'arraybuffer' }
    );
  }
}

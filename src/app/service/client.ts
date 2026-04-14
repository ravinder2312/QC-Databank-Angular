import { HttpClient } from "@angular/common/http";
import { Injectable, signal } from "@angular/core";
import { environment } from "../../enviroments/enviroment";

@Injectable({ providedIn: 'root' })
export class Client {
  private readonly API = `${environment.apiBaseUrl}/admin`;
    // looading on http Request
 private _loading = signal(false);
  public readonly loading = this._loading.asReadonly();


  constructor(private http: HttpClient) {}

    show(): void {
    this._loading.set(true);
  }

  hide(): void {
    this._loading.set(false);
  }


  getClientList() {
    return this.http.get<{
      clientid: string;
      name: string;
      
    }[]>(`${this.API}/getClients`);
  }


  getKeywordList() {
    return this.http.get<any[]>(`${this.API}/getKeywordList`);
  }

  getClientKeywordsList(keyword: string) {
    return this.http.post<any>(`${this.API}/getClientKeywords`, { keyword: `${keyword}%` });
  }
}

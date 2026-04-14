import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Client } from '../service/client';

@Component({
  standalone: true,
  selector: 'app-keyword-search',
  imports: [CommonModule],
  template: `
    <div class="modal-header">
  <h5 class="modal-title">Select Keyword</h5>
  <button class="btn-close" (click)="activeModal.dismiss()"></button>
  
</div>

<div class="modal-body">

  <!-- 🔍 Search (STATIC) -->
  <div class="search-box">
    <input
      type="text"
      class="form-control"
      placeholder="Search keyword..."
      (input)="search.set($any($event.target).value)"
    />
  </div>

  <!-- 📃 Scrollable list -->
  <div class="keyword-body">
    <div class="keyword-list">
      @for (kw of filteredKeywords(); track $index) {
        <div
          class="keyword-item"
          (click)="selectKeyword(kw)"
        >
          {{ kw.name }}
          @if (kw.filter_string) {
            <span class="filter">({{ kw.filter_string }})</span>
          }
        </div>
      }

      @if (filteredKeywords().length === 0) {
        <div class="no-data">No keywords found</div>
      }
    </div>
  </div>

</div>

  `,
  styles: [`
    .keyword-body {
      max-height: 65vh;
      overflow-y: auto;
    }

    .keyword-item {
      padding: 10px 14px;
      border-bottom: 1px solid #e5e5e5;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.15s ease;
    }

    .keyword-item:hover {
      background-color: #0d6efd;
      color: #fff;
    }

    .no-data {
      padding: 12px;
      text-align: center;
      color: #888;
      font-size: 13px;
    }

    .search-box {
  position: sticky;
  top: 0;
  background: #fff;
  padding-bottom: 8px;
  z-index: 10;
}

.keyword-body {
  max-height: 55vh;
  overflow-y: auto;
  border-top: 1px solid #e5e5e5;
}

  `]
})
export class KeywordSearchComponent {

  /** 🔹 State */
  keywords = signal<any[]>([]);
  search = signal('');

  /** 🔹 Filtered list */
  filteredKeywords = computed(() => {
    const term = this.search().toLowerCase();
    return this.keywords().filter(k =>
      k.name.toLowerCase().includes(term)
    );
  });

  constructor(
    public activeModal: NgbActiveModal,
    private client: Client
  ) {
    this.client.getKeywordList().subscribe(res => {
      this.keywords.set(res);
    });
  }

  selectKeyword(kw: any) {
    (document.activeElement as HTMLElement)?.blur();
    this.activeModal.close(kw);  
}
}

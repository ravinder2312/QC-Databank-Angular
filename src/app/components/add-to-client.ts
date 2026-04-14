import { Component, computed, signal, inject, EventEmitter, Output} from '@angular/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Client } from '../service/client';
import { NgbActiveModal, NgbModal  } from '@ng-bootstrap/ng-bootstrap';
import { KeywordSearchComponent } from '../components/keyword-search';

@Component({
  selector: 'app-add-to-client',
  standalone: true,
  imports: [NgSelectModule, ReactiveFormsModule],
  template: `
  <div class="modal-content">
    <form [formGroup]="form">
      <div class="modal-header justify-content-between">
        <h5 class="modal-title aside-heading border-0">Add to Client</h5>
        <button type="button" class="close btn" (click)="activeModal.dismiss()">
          <span>&times;</span>
        </button>
      </div>
      <div class="modal-body">
      <div class="container-fluid contact-form">
  <!-- Selected Keyword -->
  <div class="row align-items-center mb-2">
    <div class="col-2 text-end label">Select keyword</div>
    <div class="col-1">
      <input type="text" class="input-text w-100" formControlName="KeywordID" >
    </div>
    <div class="col-6">
                <input
                formControlName="keyword"
                    type="text"
                    class="input-text w-100"
                    placeholder="Search keyword"
                  />
    </div>
    <div class="col-1">
      <button type="button" (click)="openKeywordPopup()">Find</button>
    </div>
  </div>

  <!-- Select All -->
  <div class="row mb-2 align-items-center">
    <div class="col-12 d-flex align-items-center gap-2">
      <input
        type="checkbox"
        id="selectAll"
        [checked]="isAllSelected()"
        (change)="toggleSelectAll($event)"
      />
      <label for="selectAll" class="mb-0 fw-semibold">
        Select all keywords
      </label>
    </div>
  </div>

  <!-- Table -->
  <div class="row">
    <div class="col-12">
      <div class="table-wrapper">
        <table class="table table-bordered table-striped table-sm mb-0">
          <thead>
            <tr>
              <th>KeyWord</th>
              <th>Filter</th>
              <th>Filter String</th>
              <th>Client</th>
              <th>Keyid</th>
              <th>Add</th>
              <th>Client Id</th>
              <th>Category</th>
              <th>Keytype</th>
              <th>Companys</th>
              <th>Brands</th>
              <!-- <th>
  <input
    type="checkbox"
    [checked]="isAllSelected()"
    (change)="toggleSelectAll($event)"
  />
</th> -->

            </tr>
          </thead>
          <tbody>
            @for (kw of clientKeywords(); track kw.KeywordID + '_' + kw.clientid) {
              <tr [class.table-primary]="isKeywordSelected(kw)">
                <td>{{ kw.Keyword }}</td>
                <td>{{ kw.filter }}</td>
                <td>{{ kw.filter_string }}</td>
                <td>{{ kw.Clients }}</td>
                <td>{{ kw.KeywordID }}</td>
                <td>
                  <input
                    type="checkbox"
                    [checked]="isKeywordSelected(kw)"
                    (change)="onKeywordSelect($event, kw)"
                  >
                </td>
                <td>{{ kw.clientid }}</td>
                <td>{{ kw.keycategory }}</td>
                <td>{{ kw.keytype }}</td>
                <td>{{ kw.companys }}</td>
                <td>{{ kw.brands }}</td>
              </tr>
            }
          </tbody>


        </table>
      </div>
    </div>
  </div>
</div>

      </div>
      <div class="modal-footer">
          <div class="row justify-content-center g-2">
            <div class="col-auto">
              <button class="view-btn "  [disabled]="!canSubmit()" (click)="submit()">Add To Client</button>
            </div>
            <div class="col-auto">
              <!-- <button class="view-btn impact-secondary" (click)="activeModal.dismiss()">Close</button> -->
              <button class="btn btn-secondary" (click)="activeModal.dismiss()">close</button>
            </div>
          </div>
      </div>
    </form>
    </div>
  `,
  styles: [`
  /* Blue hover like desktop grid */
.table tbody tr:hover td {
  background-color: #0d6efd !important;
  color: #ffffff;
  cursor: pointer;
}

/* Keep text readable on hover */
.table tbody tr:hover td {
  color: #ffffff;
}

.table tbody tr td{
  transition: background-color 0.15s ease;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.table-wrapper {
  max-height: calc(90vh - 220px);        /* adjust as needed */
  overflow-y: auto;
  border: 1px solid #dee2e6;
}

/* Sticky header */
.table thead th {
  position: sticky;
  top: 0;
  background: #f8f9fa;
  z-index: 2;
}

.impact-secondary {
  background-color: #9fa1a2 !important;
  font-size: 13px !important;
  color: #fff !important;
  border-radius: 5px;
  padding: 10px auto;
  text-align: center;
  min-width: 96px;
}

 `],
})
export class AddToClient {

  private fb = inject(FormBuilder);

  /** 🔹 SIGNAL STATE */
  clients = signal<{ name: string; id: string }[]>([]);
  clientKeywords = signal<any[]>([]);
  selectedKeyword = signal<any[]>([]);
  formValid = signal(false);
  @Output() submitEvent = new EventEmitter<any>();


  constructor(
    public activeModal: NgbActiveModal,
    private client: Client,
    private modalService: NgbModal
  ) {}

  form = this.fb.group({
    keyword: this.fb.control<string | null>(null, Validators.required),
    KeywordID: this.fb.control<number | null>(null, Validators.required)
  });


  // loadClientKeywords() {
  //   const keyword = this.form.get('keyword')?.value || '';
  //   this.client.getClientKeywordsList(keyword).subscribe({
  //     next: (res) => {
  //       // console.log('Client keywords:', res);
  //       this.clientKeywords.set(res);
  //     },
  //     error: (err) => console.error(err)
  //   });
  // }

  loadClientKeywords() {
    const keyword = this.form.get('keyword')?.value || '';
    this.client.getClientKeywordsList(keyword).subscribe(res => {
      this.clientKeywords.set(res);
    });
  }


  openKeywordPopup() {
    const modalRef = this.modalService.open(KeywordSearchComponent, {
      size: 'lg',
      backdrop: 'static'
    });

    modalRef.result.then((kw: any) => {
      if (kw) {
        this.form.patchValue({
          keyword: kw.name,
          KeywordID: kw.id
        });

        this.loadClientKeywords(); // load table
      }
    }).catch(() => {});
  }



  isKeywordSelected(kw: any): boolean {
    return this.selectedKeyword().some(
      k => `${k.KeywordID}_${k.clientid}` === `${kw.KeywordID}_${kw.clientid}`
    );
  }




  onKeywordSelect(event: Event, kw: any) {
  const checked = (event.target as HTMLInputElement).checked;

    if (checked) {
      // prevent duplicates
      if (!this.selectedKeyword().some(k => `${k.KeywordID}_${k.clientid}` === `${kw.KeywordID}_${kw.clientid}`)) {
        this.selectedKeyword.update(items => [...items, kw]);
      }
    } else {
      this.selectedKeyword.update(items =>
        items.filter(k => `${k.KeywordID}_${k.clientid}` !== `${kw.KeywordID}_${kw.clientid}`)
      );
    }
  }

  isAllSelected(): boolean {
    const keywords = this.clientKeywords();
    return (
      keywords.length > 0 &&
      keywords.every(kw =>
        this.selectedKeyword().some(k => k.KeywordID === kw.KeywordID)
      )
    );
  }

  toggleSelectAll(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;

    if (checked) {
      // Select all
      this.selectedKeyword.set([...this.clientKeywords()]);
    } else {
      // Deselect all
      this.selectedKeyword.set([]);
    }
  }


  submit() {
    console.log('Selected rows:', this.selectedKeyword());
    // console.log('Submitting to client:', client, 'with keyword ID:', this.selectedKeyword() );
    // Here you would typically call a service to perform the action
    this.submitEvent.emit({ selectedKeywords: this.selectedKeyword() });
    this.activeModal.close();
  }

  canSubmit = computed(() => {
    // console.log("selcted keyword: ", this.selectedKeyword().length);
    
    return this.selectedKeyword().length > 0;
  });


}

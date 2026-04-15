import { fetchJson } from "../../shared/utils/fetch-json";
import {createElement} from "../../shared/utils/create-element";

const BACKEND_URL = 'https://course-js.javascript.ru';
const PRODUCTS_DATA_URL = '/api/rest/products';

type SortOrder = 'asc' | 'desc';

type SortableTableData = Record<string, unknown>;

type SortableTableSort = {
  id: string;
  order: SortOrder;
};

interface SortableTableHeader {
  id: string;
  title: string;
  sortable?: boolean;
  sortType?: 'string' | 'number' | 'custom';
  template?: (value: unknown) => string;
  customSorting?: (a: SortableTableData, b: SortableTableData) => number;
}

interface Options {
  url?: string;
  sorted?: SortableTableSort;
  isSortLocally?: boolean;
  step?: number;
  start?: number;
  end?: number;
}

export default class SortableTable {
  url: string;
  sorted?: SortableTableSort;
  isSortLocally: boolean;
  step: number;
  start: number;
  end: number;
  headersConfig: SortableTableHeader[];

  element: HTMLElement;
  private body?: HTMLElement;
  private header?: HTMLElement;
  private cells?: NodeListOf<HTMLElement>;
  private data?: SortableTableData[];
  private sortedData?: SortableTableData[];
  private fetchingNextPage: boolean = false;

  constructor(headersConfig: SortableTableHeader[] = [], {
    url = '',
    sorted,
    isSortLocally = false,
    step = 30,
    start = 0,
    end = 30
  }: Options = {}) {
    this.headersConfig = headersConfig;
    this.url = url;
    this.sorted = sorted;
    this.isSortLocally = isSortLocally;
    this.step = step;
    this.start = start;
    this.end = end;

    this.element = createElement(this.template);
    this.body = this.element.querySelector('[data-element="body"]') as HTMLElement;
    this.header = this.element.querySelector('[data-element="header"]') as HTMLElement;
    this.cells = this.header?.querySelectorAll<HTMLElement>('[data-id]');

    this.render();

    if (this.header) {
      this.header.addEventListener('pointerdown', this.sortByClick);
    }

    window.addEventListener('scroll', this.fetchNextPage, {
      passive: true,
    });
  }

  async render() {
    await this.sortOnServer(this.sorted?.id, this.sorted?.order);
    this.updateBody();
  }

  private fetchNextPage = async () => {
    if (!this.data?.length || this.isSortLocally || this.fetchingNextPage) return;

    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;
    const fullHeight = document.documentElement.scrollHeight;

    if (scrollTop + windowHeight >= fullHeight - 10) {
      this.fetchingNextPage = true;

      const loader = createElement(this.loader);

      this.body!.append(loader);

      this.start += this.step;
      this.end += this.step;
      const data = await this.fetchData(this.sorted?.id, this.sorted?.order);

      this.data.push(...data);
      this.sortedData!.push(...data);

      loader.remove();
      this.body!.innerHTML += this.getRows(data);

      this.fetchingNextPage = false;
    }
  }

  private get normalizedUrl()  {
    if (!this.url) return '';
    return this.url.startsWith('/') ? this.url : `/${this.url}`;
  }

  private sortByClick = async (event: Event)=> {
    const target = event.target as HTMLElement;
    const cell = target?.closest<HTMLElement>('.sortable-table__cell');
    if (!cell?.dataset.id || !cell.hasAttribute('data-sortable')) return;

    if (!this.sorted || cell.dataset.id !== this.sorted.id) {
      this.sorted = {
        id: cell.dataset.id,
        order: 'desc',
      }
    } else {
      this.sorted.order = this.sorted.order === 'asc' ? 'desc' : 'asc';
    }

    this.sortedData = await this.sort(this.sorted?.id, this.sorted?.order);

    this.updateBody();
    this.updateHeader();
  }

  private updateBody() {
    if (this.body) {
      this.body.innerHTML = this.getDataRows();
    }
  }

  private updateHeader() {
    this.cells?.forEach(cell => {
      if (cell.dataset.id === this.sorted?.id) {
        cell.dataset.order = this.sorted?.order;
        const arrow = cell.querySelector('[data-element="arrow"]') as HTMLElement;
        if (!arrow) {
          cell.append(createElement(this.arrow));
        }
      } else {
        cell.removeAttribute('data-order');
        const arrow = cell.querySelector('[data-element="arrow"]') as HTMLElement;
        if (arrow) arrow.remove();
      }
    });
  }

  private get template() {
    return `
      <div data-element="productsContainer" class="products-list__container">
        <div class="sortable-table sortable-table_loading">
            ${this.headerTemplate}
            <div data-element="body" class="sortable-table__body">
                ${this.getDataRows()}
            </div>
        </div>
      </div>
    `;
  }

  private get headerTemplate() {
    if (!this.headersConfig?.length) return '';

    const headerCols = this.headersConfig.map((header) => {
      let datasetAttrs = [];
      if (header.sortable) {
        datasetAttrs.push('data-sortable="true"');
      }
      if (this.sorted?.id === header.id) {
        datasetAttrs.push('data-order="' + this.sorted.order + '"');
      }
      return `
        <div class="sortable-table__cell" data-id="${header.id}" ${datasetAttrs.join(' ')}>
            <span>${header.title}</span>
            ${this.sorted?.id === header.id ? this.arrow : ''}
        </div>
      `;
    }).join('');

    return `
      <div data-element="header" class="sortable-table__header sortable-table__row">
        ${headerCols}
      </div>
    `;
  }

  private get arrow() {
    return `
        <span data-element="arrow" class="sortable-table__sort-arrow">
          <span class="sort-arrow"></span>
        </span>
    `;
  }

  private getDataRows() {
    if (!this.sortedData?.length || !this.headersConfig?.length) {
      return `
        <div data-element="emptyPlaceholder" class="sortable-table__empty-placeholder">
          <div>
            <p>No products satisfies your filter criteria</p>
            <button type="button" class="button-primary-outline">Reset all filters</button>
          </div>
        </div>
      `;
    }
    return this.getRows(this.sortedData);
  }

  private getRows(data: SortableTableData[]) {
    if (!data?.length) return '';

    return data.map((item) => {
      const cols = this.headersConfig.map((header) =>
        this.cellTemplate(item, header)
      );

      return `<a href="/products/${item.id}" class="sortable-table__row">${cols.join('')}</a>`;
    }).join('');
  }

  private cellTemplate(item: SortableTableData, header: SortableTableHeader) {
    if (header.template) {
      return header.template(item[header.id]);
    }
    return `<div class="sortable-table__cell">${item[header.id]}</div>`;
  }

  async sort(sortedId: string | undefined, sortedOrder: SortOrder | undefined): Promise<SortableTableData[]> {
    if (!sortedId && this.data?.length) return [...this.data];
    return this.isSortLocally ?  this.sortOnClient(sortedId, sortedOrder) : this.sortOnServer(sortedId, sortedOrder);
  }

  private get loader() {
    return `
      <div data-element="loading" class="loading-line sortable-table__loading-line"></div>
    `;
  }

  private async fetchData(sortedId: string | undefined, sortedOrder: SortOrder | undefined) {
    const params = [];
    params.push('_embed=subcategory.category');
    if (sortedId) params.push(`_sort=${sortedId}`);
    if (sortedOrder) params.push(`_order=${sortedOrder}`);
    params.push(`_start=${this.start}`);
    params.push(`_end=${this.end}`);

    const data: SortableTableData[] = await fetchJson(`${BACKEND_URL}${this.normalizedUrl || PRODUCTS_DATA_URL}?${params.join('&')}`);
    return data;
  }

  async sortOnServer(sortedId: string | undefined, sortedOrder: SortOrder | undefined): Promise<SortableTableData[]> {
    if (this.body) {
      this.body.innerHTML = this.loader;
    }

    this.start = 0;
    this.end = this.step;

    const data = await this.fetchData(sortedId, sortedOrder);
    this.data = data;
    this.sortedData = data;
    return data;
  }

  sortOnClient(sortedId: string | undefined, sortedOrder: SortOrder | undefined): SortableTableData[] {
    if (!this.data?.length) return [];

    const data = [...this.data];

    if (!sortedId) return data;

    const sortHeader = this.headersConfig.find(headerConfig => headerConfig.id === sortedId);
    if (!sortHeader) return data;

    const { id, sortType, customSorting } = sortHeader;
    const direction = sortedOrder === 'asc' ? 1 : -1;

    let compare;
    if (sortType === 'custom' && customSorting) {
      compare = customSorting;
    } else {
      compare = (a: SortableTableData, b: SortableTableData) => {
        if (sortType === 'string') {
          return String(a[id]).localeCompare(String(b[id]),  ['ru', 'en'], { caseFirst: 'upper' });
        }
        return (a[id] as number) - (b[id] as number);
      };
    }
    return data.sort((a, b) => compare(a, b) * direction);
  }

  remove() {
    this.element.remove();
  }

  destroy() {
    if (this.header) {
      this.header?.removeEventListener('pointerdown', this.sortByClick);
    }

    this.remove();
  }
}

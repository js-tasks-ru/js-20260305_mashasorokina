import { createElement } from "../../shared/utils/create-element";
import { required } from "../../shared/utils/required";

type SortOrder = 'asc' | 'desc';

type SortableTableData = Record<string, string | number>;

type SortableTableSort = {
  id: string;
  order: SortOrder;
};

interface SortableTableHeader {
  id: string;
  title: string;
  sortable?: boolean;
  sortType?: 'string' | 'number' | 'custom';
  template?: (value: string | number) => string;
  customSorting?: (a: SortableTableData, b: SortableTableData) => number;
}

interface Options {
  data?: SortableTableData[];
  sorted?: SortableTableSort;
  isSortLocally?: boolean;
}

export default class SortableTable {
  private _element: HTMLElement | null = null;

  private headersConfig: SortableTableHeader[];
  private data: SortableTableData[];
  private sorted: SortableTableSort;
  private isSortLocally: boolean;

  constructor(headersConfig: SortableTableHeader[] = [], {
    data = [],
    sorted,
    isSortLocally = true
  }: Options = {}) {
    this.headersConfig = headersConfig;
    this.data = data;
    this.sorted = sorted ?? this.getDefaultSort();
    this.isSortLocally = isSortLocally;

    this._element = createElement(this.template);

    this.initEventListeners();
    this.sort(this.sorted.id, this.sorted.order);
  }

  get element(): HTMLElement {
    if (!this._element) {
      throw new Error("Element has been destroyed or not rendered");
    }
    return this._element;
  }

  private sub<T extends HTMLElement = HTMLElement>(element: string): T {
    return required(
      this.element.querySelector<T>(`[data-element="${element}"]`),
      `Sub element with data-element="${element}" not found`
    );
  }

  private onSortClick = (event: PointerEvent): void => {
    const target = event.target as HTMLElement | null;
    const column = target?.closest<HTMLElement>('[data-sortable="true"]');

    const columnId = column?.dataset.id;

    if (!columnId) {
      return;
    }

    const { order } = column.dataset;
    const newOrder: SortOrder = order === 'asc' ? 'desc' : 'asc';

    this.sort(columnId, newOrder);
  };

  private getDefaultSort(): SortableTableSort {
    const sortableColumn = this.headersConfig.find(item => item.sortable) ?? this.headersConfig[0];

    return {
      id: sortableColumn?.id ?? '',
      order: 'asc'
    };
  }

  private getHeaderRow({ id, title, sortable }: SortableTableHeader): string {
    const isSortable = Boolean(sortable);
    const isSortedColumn = this.sorted.id === id;
    const order = isSortable ? (isSortedColumn ? this.sorted.order : 'asc') : '';
    const orderAttribute = order ? ` data-order="${order}"` : '';

    return `
      <div class="sortable-table__cell" data-id="${id}" data-sortable="${isSortable}"${orderAttribute}>
        <span>${title}</span>
        ${isSortable && isSortedColumn ? `
          <span data-element="arrow" class="sortable-table__sort-arrow">
            <span class="sort-arrow"></span>
          </span>
        ` : ''}
      </div>
    `;
  }

  private getTableBody(): string {
    return `
      <div data-element="body" class="sortable-table__body">
        ${this.getTableRows(this.data)}
      </div>`;
  }

  private getTableRows(data: SortableTableData[]): string {
    return data.map(item => {
      return `
        <a href="/products/${item.id}" class="sortable-table__row">
          ${this.getTableRow(item)}
        </a>`;
    }).join('');
  }

  private getTableRow(item: SortableTableData): string {
    const cells: string[] = [];

    for (const { id, template } of this.headersConfig) {
      const value = item[id];

      cells.push(template
        ? template(value)
        : `<div class="sortable-table__cell">${value}</div>`);
    }

    return cells.join('');
  }

  get template(): string {
    return `
      <div class="sortable-table">
        <div data-element="header" class="sortable-table__header sortable-table__row">
          ${this.headersConfig.map(item => this.getHeaderRow(item)).join('')}
        </div>
        ${this.getTableBody()}
      </div>`;
  }

  private initEventListeners(): void {
    this.sub('header').addEventListener('pointerdown', this.onSortClick);
  }

  sort(field: string, order: SortOrder): void {
    const headerColumn = this.headersConfig.find(item => item.id === field);
    const body = this.sub('body');
    const header = this.sub('header');
    if (!headerColumn?.sortable) {
      return;
    }

    const currentColumn = header.querySelector<HTMLElement>(`.sortable-table__cell[data-id="${field}"]`);

    if (!currentColumn) {
      return;
    }

    currentColumn.dataset.order = order;

    const arrow = this.sub('arrow');
    currentColumn.append(arrow);

    this.sorted = {
      id: field,
      order
    };

    if (this.isSortLocally) {
      const sortedData = this.sortData(field, order);

      body.innerHTML = this.getTableRows(sortedData);
    }
  }

  private sortData(field: string, order: SortOrder): SortableTableData[] {
    const arr = [...this.data];
    const column = this.headersConfig.find(item => item.id === field);

    if (!column) {
      return arr;
    }

    const sortType = column?.sortType ?? 'string';
    const customSorting = column?.customSorting;
    const directions = {
      asc: 1,
      desc: -1
    };
    const direction = directions[order];

    return arr.sort((a, b) => {
      const aValue = a[field] ?? '';
      const bValue = b[field] ?? '';

      switch (sortType) {
        case 'number':
          return direction * (Number(aValue) - Number(bValue));
        case 'string':
          return direction * String(aValue).localeCompare(String(bValue), ['ru', 'en']);
        case 'custom':
          return customSorting ? direction * customSorting(a, b) : 0;
        default:
          return direction * (Number(aValue) - Number(bValue));
      }
    });
  }

  remove(): void {
    this.sub('header').removeEventListener('pointerdown', this.onSortClick);

    this._element?.remove();
  }

  destroy(): void {
    if (this._element) {
      this.remove();
    }
    this._element = null;
  }
}

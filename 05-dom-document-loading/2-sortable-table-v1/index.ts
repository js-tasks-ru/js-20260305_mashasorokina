import { createElement } from "../../shared/utils/create-element";
import { required } from "../../shared/utils/required";

type SortOrder = 'asc' | 'desc';

type SortableTableData = Record<string, string | number>;

interface SortableTableHeader {
  id: string;
  title: string;
  sortable?: boolean;
  sortType?: 'string' | 'number';
  template?: (value: string | number) => string;
}

export default class SortableTable {
  private _element: HTMLElement | null;

  private headersConfig: SortableTableHeader[];
  private data: SortableTableData[];

  constructor(headersConfig: SortableTableHeader[] = [], data: SortableTableData[] = []) {
    this.headersConfig = headersConfig;
    this.data = data;

    this._element = createElement(this.template);
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

  private getHeaderRow({ id, title, sortable }: SortableTableHeader): string {
    const isSortable = Boolean(sortable);

    return `
      <div class="sortable-table__cell" data-id="${id}" data-sortable="${isSortable}">
        <span>${title}</span>
        ${isSortable ? `
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

  private get template(): string {
    return `
      <div class="sortable-table">
        <div data-element="header" class="sortable-table__header sortable-table__row">
          ${this.headersConfig.map(item => this.getHeaderRow(item)).join('')}
        </div>
        ${this.getTableBody()}
      </div>`;
  }

  sort(field: string, order: SortOrder): void {
    const headerColumn = this.headersConfig.find(item => item.id === field);

    const body = this.sub('body');
    const header = this.sub('header');
    if (!headerColumn?.sortable) {
      return;
    }

    const sortedData = this.sortData(field, order);
    const allColumns = header.querySelectorAll<HTMLElement>('.sortable-table__cell[data-id]') ?? [];
    const currentColumn = header.querySelector<HTMLElement>(`.sortable-table__cell[data-id="${field}"]`);

    if (!currentColumn) {
      return;
    }

    // NOTE: Remove sorting arrow from other columns
    allColumns.forEach(column => {
      delete column.dataset.order;
    });

    currentColumn.dataset.order = order;

    body.innerHTML = this.getTableRows(sortedData);
  }

  private sortData(field: string, order: SortOrder): SortableTableData[] {
    const arr = [...this.data];
    const column = this.headersConfig.find(item => item.id === field);

    if (!column) {
      return arr;
    }

    const sortType = column?.sortType ?? 'string';
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
        default:
          return direction * (Number(aValue) - Number(bValue));
      }
    });
  }

  remove(): void {
    this._element?.remove();
  }

  destroy(): void {
    this.remove();
    this._element = null;
  }
}

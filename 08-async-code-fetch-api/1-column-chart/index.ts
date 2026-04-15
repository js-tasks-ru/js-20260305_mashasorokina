import { fetchJson } from "../../shared/utils/fetch-json";
import { createElement } from "../../shared/utils/create-element";

const BACKEND_URL = 'https://course-js.javascript.ru';
const ORDERS_DATA_URL = '/api/dashboard/orders';

interface DateRange {
  from: Date;
  to: Date;
}

type TableData = { [s: string]: number; };

interface Options {
  url?: string;
  range?: DateRange;
  label?: string;
  link?: string | null;
  formatHeading?: (value: number) => string | number;
}

export default class ColumnChart {
  private url: string;
  private label: string;
  private link: string | null;
  private formatHeading: Function;
  private data?: number[];

  public element: HTMLElement;
  public chartHeight = 50;

  private header?: HTMLElement;
  private body?: HTMLElement;

  constructor({ url = '', range = { from: new Date(), to: new Date() }, label = '', link = null, formatHeading = (v: number) => v }: Options = {}) {
    this.url = url;
    this.label = label;
    this.link = link;
    this.formatHeading = formatHeading;
    this.element = createElement(this.template);
    this.header = this.element.querySelector('[data-element="header"]') as HTMLElement;
    this.body = this.element.querySelector('[data-element="body"]') as HTMLElement;

    this.update(range.from, range.to);
  }

  private get template() {
    return `
      <div class="column-chart column-chart_loading" style="--chart-height: ${this.chartHeight}">
        ${this.titleTemplate}
        <div class="column-chart__container">
            <div data-element="header" class="column-chart__header">${this.value ? this.formatHeading(this.value) : ''}</div>
            <div data-element="body" class="column-chart__chart">
                ${this.itemsTemplate}
            </div>
        </div>
      </div>
    `;
  }

  private get itemsTemplate() {
    if (!this.data?.length) return '';

    const maxValue = Math.max(...this.data);
    const scale = maxValue ? this.chartHeight / maxValue : 0;
    return this.data?.map(item => {
      return `<div style="--value: ${Math.floor(item * scale)}" data-tooltip="${maxValue ? (item / maxValue * 100).toFixed(0) : 0}%"></div>`
    }).join('');
  }

  private get titleTemplate() {
    const link = this?.link ? `<a href="${this.link}" class="column-chart__link">View all</a>` : '';
    return `
      <div class="column-chart__title">
        ${this.label}
        ${link}
      </div>
    `;
  }

  private get value(): number | null {
    if (!this.data?.length) return null;
    return this.data.reduce((sum: number, current: number) => sum + current, 0);
  }

  private get normalizedUrl() {
    if (!this.url) return '';
    return this.url.startsWith('/') ? this.url : `/${this.url}`;
  }

  async update(from: Date, to: Date) {
    this.element.classList.add('column-chart_loading');

    const json: TableData = await fetchJson(`${BACKEND_URL}${this.normalizedUrl || ORDERS_DATA_URL}?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`);
    this.data = Object.values(json);

    if (this.header) {
      this.header.innerHTML = this.formatHeading ? this.formatHeading(this.value) : this.value?.toString();
    }

    if (this.body) {
      this.body.innerHTML = this.itemsTemplate;
    }

    if (!this.data.length) {
      this.element.classList.add('column-chart_loading');
    } else {
      this.element.classList.remove('column-chart_loading');
    }

    return json;
  }

  remove() {
    this.element.remove();
  }

  destroy() {
    this.remove();
  }
}

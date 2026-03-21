import { createElement } from "../../shared/utils/create-element";

interface Options {
  data?: number[];
  label?: string;
  link?: string;
  value?: number;
  formatHeading?: (value: number) => string | number;
}

export default class ColumnChart {
  chartHeight = 50;

  private _element: HTMLElement | null = null;
  private bodyElement: HTMLElement | null = null;
  private data: number[];
  private label: string;
  private link: string;
  private value: string | number;

  constructor({
    data = [],
    label = '',
    link = '',
    value = 0,
    formatHeading = data => data,
  }: Options = {}) {
    this.data = data;
    this.label = label;
    this.link = link;
    this.value = formatHeading(value);

    this.render();
  }

  get element(): HTMLElement {
    if (!this._element) {
      throw new Error("Element has been destroyed or not rendered");
    }
    return this._element;
  }

  private getColumnBody(): string {
    if (!this.data.length) {
      return '';
    }

    const normalizedData = this.data.map(item => Math.max(0, item));
    const maxValue = Math.max(...normalizedData);

    if (maxValue === 0) {
      return normalizedData
        .map(() => `<div style="--value: 0" data-tooltip="0%"></div>`)
        .join('');
    }

    const scale = this.chartHeight / maxValue;

    return normalizedData
      .map(item => {
        const percent = (item / maxValue * 100).toFixed(0);

        return `<div style="--value: ${Math.floor(item * scale)}" data-tooltip="${percent}%"></div>`;
      })
      .join('');
  }

  private get template(): string {
    return `
      <div class="column-chart" style="--chart-height: ${this.chartHeight}">
        <div class="column-chart__title">
          Total ${this.label}
          ${this.link ? `<a class="column-chart__link" href="${this.link}">View all</a>` : ''}
        </div>
        <div class="column-chart__container">
           <div data-element="header" class="column-chart__header">
             ${this.value}
           </div>
          <div data-element="body" class="column-chart__chart">
            ${this.getColumnBody()}
          </div>
        </div>
      </div>
    `;
  }

  private updateLoadingState(): void {
    this._element?.classList.toggle('column-chart_loading', !this.data.length);
  }

  private render(): void {
    this._element = createElement(this.template);
    this.bodyElement = this._element.querySelector('[data-element="body"]');

    if (!this.bodyElement) {
      throw new Error('Column chart body element was not found');
    }

    this.updateLoadingState();
  }

  update(data: number[]): void {
    if (!this.bodyElement) {
      return;
    }

    this.data = data;
    this.bodyElement.innerHTML = this.getColumnBody();
    this.updateLoadingState();
  }

  remove(): void {
    this._element?.remove();
  }

  destroy(): void {
    this.remove();
    this.bodyElement = null;
    this._element = null;
  }
}

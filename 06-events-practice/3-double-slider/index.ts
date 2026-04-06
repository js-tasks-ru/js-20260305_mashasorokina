import { createElement } from "../../shared/utils/create-element";
import { required } from "../../shared/utils/required";

type DoubleSliderSelected = {
  from: number;
  to: number;
};

interface Options {
  min?: number;
  max?: number;
  formatValue?: (value: number) => string;
  selected?: DoubleSliderSelected;
}

export default class DoubleSlider {
  private _element: HTMLElement;
  readonly min: number;
  readonly max: number;
  private dragging: HTMLElement | null = null;
  private shiftX = 0;
  private formatValue: (value: number) => string;
  private selected: DoubleSliderSelected;

  constructor({
    min = 100,
    max = 200,
    formatValue = value => `$${value}`,
    selected = {
      from: min,
      to: max
    }
  }: Options = {}) {
    const resolvedMin = Math.min(min, max);
    const resolvedMax = Math.max(min, max);
    this.min = resolvedMin;
    this.max = resolvedMax;
    this.formatValue = formatValue;
    this.selected = this.normalizeSelected(selected, resolvedMin, resolvedMax);

    this._element = createElement(this.template);

    this.initEventListeners();

    this.update();
  }

  private sub<T extends HTMLElement = HTMLElement>(element: string): T {
    return required(
      this.element.querySelector<T>(`[data-element="${element}"]`),
      `Sub element with data-element="${element}" not found`
    );
  }

  get element(): HTMLElement {
    if (!this._element) {
      throw new Error("Element has been destroyed or not rendered");
    }
    return this._element;
  }

  get template(): string {
    const { from, to } = this.selected;

    return `<div class="range-slider">
      <span data-element="from">${this.formatValue(from)}</span>
      <div data-element="inner" class="range-slider__inner">
        <span data-element="progress" class="range-slider__progress"></span>
        <span data-element="thumbLeft" class="range-slider__thumb-left"></span>
        <span data-element="thumbRight" class="range-slider__thumb-right"></span>
      </div>
      <span data-element="to">${this.formatValue(to)}</span>
    </div>`;
  }

  private initEventListeners(): void {
    this.sub('thumbLeft').addEventListener('pointerdown', event => this.onThumbPointerDown(event));
    this.sub('thumbRight').addEventListener('pointerdown', event => this.onThumbPointerDown(event));
  }

  remove(): void {
    this.element.remove();
  }

  destroy(): void {
    if (this._element) {
      this.remove();
    }

    document.removeEventListener('pointermove', this.onThumbPointerMove);
    document.removeEventListener('pointerup', this.onThumbPointerUp);
  }

  private update(): void {
    const rangeTotal = this.max - this.min;
    const leftPercent = rangeTotal === 0 ? 0 : Math.floor((this.selected.from - this.min) / rangeTotal * 100);
    const rightPercent = rangeTotal === 0 ? 0 : Math.floor((this.max - this.selected.to) / rangeTotal * 100);
    const left = `${leftPercent}%`;
    const right = `${rightPercent}%`;

    const progress = this.sub('progress');
    progress.style.left = left;
    progress.style.right = right;

    const thumbLeft = this.sub('thumbLeft');
    const thumbRight = this.sub('thumbRight');
    thumbLeft.style.left = left;
    thumbRight.style.right = right;
  }

  private onThumbPointerMove = (event: PointerEvent): void => {
    event.preventDefault();

    if (!this.dragging) {
      return;
    }

    const inner = this.sub('inner');
    const { left: innerLeft, right: innerRight, width } = inner.getBoundingClientRect();

    if (width <= 0) {
      return;
    }

    const thumbLeft = this.sub('thumbLeft');
    const progress = this.sub('progress');
    const from = this.sub('from');
    const to = this.sub('to');
    if (this.dragging === thumbLeft) {
      const maxLeft = 100 - this.getRightPercent();
      const nextLeft = (event.clientX - innerLeft - this.shiftX) / width * 100;
      const newLeft = this.clamp(nextLeft, 0, maxLeft);

      this.dragging.style.left = progress.style.left = `${newLeft}%`;
      from.textContent = this.formatValue(this.getValue().from);
      this.selected = this.getValue();
    }

    const thumbRight = this.sub('thumbRight');
    if (this.dragging === thumbRight) {
      const maxRight = 100 - this.getLeftPercent();
      const nextRight = (innerRight - event.clientX - this.shiftX) / width * 100;
      const newRight = this.clamp(nextRight, 0, maxRight);

      this.dragging.style.right = progress.style.right = `${newRight}%`;
      to.textContent = this.formatValue(this.getValue().to);
      this.selected = this.getValue();
    }
  };

  private onThumbPointerUp = (): void => {
    this.element.classList.remove('range-slider_dragging');

    document.removeEventListener('pointermove', this.onThumbPointerMove);
    document.removeEventListener('pointerup', this.onThumbPointerUp);

    this.element.dispatchEvent(new CustomEvent('range-select', {
      detail: this.getValue(),
      bubbles: true
    }));

    this.selected = this.getValue();
  };

  private onThumbPointerDown(event: PointerEvent): void {
    const thumbElem = event.currentTarget as HTMLElement | null;

    if (!thumbElem) {
      return;
    }

    event.preventDefault();

    const { left, right } = thumbElem.getBoundingClientRect();

    if (thumbElem === this.sub('thumbLeft')) {
      this.shiftX = event.clientX - left;
    } else {
      this.shiftX = right - event.clientX;
    }

    this.dragging = thumbElem;

    this.element.classList.add('range-slider_dragging');

    document.addEventListener('pointermove', this.onThumbPointerMove);
    document.addEventListener('pointerup', this.onThumbPointerUp);
  }

  getValue(): DoubleSliderSelected {
    const rangeTotal = this.max - this.min;

    if (rangeTotal === 0) {
      return { from: this.min, to: this.max };
    }

    const from = Math.round(this.min + this.getLeftPercent() * 0.01 * rangeTotal);
    const to = Math.round(this.max - this.getRightPercent() * 0.01 * rangeTotal);

    return { from, to };
  }

  private normalizeSelected(
    selected: DoubleSliderSelected,
    min: number,
    max: number
  ): DoubleSliderSelected {
    const clampedFrom = this.clamp(selected.from, min, max);
    const clampedTo = this.clamp(selected.to, min, max);

    if (clampedFrom <= clampedTo) {
      return { from: clampedFrom, to: clampedTo };
    }

    return { from: clampedTo, to: clampedFrom };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private getLeftPercent(): number {
    const thumbLeft = this.sub('thumbLeft');
    return this.parsePercent(thumbLeft.style.left);
  }

  private getRightPercent(): number {
    const thumbRight = this.sub('thumbRight');
    return this.parsePercent(thumbRight.style.right);
  }

  private parsePercent(value: string): number {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}

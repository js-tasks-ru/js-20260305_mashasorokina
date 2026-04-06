import { createElement } from '../../shared/utils/create-element';
import { required } from '../../shared/utils/required';

type RangePickerSelected = {
  from: Date | null;
  to: Date | null;
};

interface Options {
  from?: Date;
  to?: Date;
}

export default class RangePicker {
  private _element: HTMLElement | null = null;
  private selectingFrom = true;
  private selected: RangePickerSelected = {
    from: null,
    to: null
  };
  private showDateFrom: Date;

  static formatDate(date: Date): string {
    return date.toLocaleString('ru', { dateStyle: 'short' });
  }

  constructor({ from = new Date(), to = new Date() }: Options = {}) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const [normalizedFrom, normalizedTo] = fromDate <= toDate
      ? [fromDate, toDate]
      : [toDate, fromDate];

    this.showDateFrom = new Date(normalizedFrom);
    this.selected = {
      from: new Date(normalizedFrom),
      to: new Date(normalizedTo)
    };

    this.render();
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

  private readonly onDocumentClick = (event: MouseEvent): void => {
    const element = this.element;

    const isOpen = element.classList.contains('rangepicker_open');
    const target = event.target as HTMLElement | null;
    const isRangePicker = target ? element.contains(target) : false;

    if (isOpen && !isRangePicker) {
      this.close();
    }
  };

  private readonly onInputClick = (): void => {
    this.toggle();
  };

  private readonly onSelectorClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;

    if (target?.classList.contains('rangepicker__cell')) {
      this.onRangePickerCellClick(target);
    }
  };

  get template(): string {
    const from = this.selected.from ? RangePicker.formatDate(this.selected.from) : '';
    const to = this.selected.to ? RangePicker.formatDate(this.selected.to) : '';

    return `<div class="rangepicker">
      <div class="rangepicker__input" data-element="input">
        <span data-element="from">${from}</span> -
        <span data-element="to">${to}</span>
      </div>
      <div class="rangepicker__selector" data-element="selector"></div>
    </div>`;
  }

  render(): void {
    this._element = createElement(this.template);
    this.initEventListeners();
  }

  private initEventListeners(): void {
    const input = this.sub('input');
    const selector = this.sub('selector');

    document.addEventListener('click', this.onDocumentClick, true);
    input.addEventListener('click', this.onInputClick);
    selector.addEventListener('click', this.onSelectorClick);
  }

  toggle(): void {
    const element = this.element;

    const isOpen = element.classList.toggle('rangepicker_open');
    if (isOpen) {
      this.renderDateRangePicker();
    }
  }

  close(): void {
    this.element.classList.remove('rangepicker_open');
  }

  private renderDateRangePicker(): void {
    const selector = this.sub('selector');

    const showDate1 = new Date(this.showDateFrom);
    const showDate2 = new Date(this.showDateFrom);

    showDate2.setMonth(showDate2.getMonth() + 1);

    selector.innerHTML = `
      <div class="rangepicker__selector-arrow"></div>
      <div class="rangepicker__selector-control-left"></div>
      <div class="rangepicker__selector-control-right"></div>
      ${this.renderCalendar(showDate1)}
      ${this.renderCalendar(showDate2)}
    `;

    const controlLeft = selector.querySelector<HTMLElement>('.rangepicker__selector-control-left');
    const controlRight = selector.querySelector<HTMLElement>('.rangepicker__selector-control-right');

    controlLeft?.addEventListener('click', () => this.prev());
    controlRight?.addEventListener('click', () => this.next());

    this.renderHighlight();
  }

  private prev(): void {
    this.showDateFrom.setMonth(this.showDateFrom.getMonth() - 1);
    this.renderDateRangePicker();
  }

  private next(): void {
    this.showDateFrom.setMonth(this.showDateFrom.getMonth() + 1);
    this.renderDateRangePicker();
  }

  private renderHighlight(): void {
    const element = this.element;

    const { from, to } = this.selected;
    const fromIso = from ? from.toISOString() : null;
    const toIso = to ? to.toISOString() : null;

    for (const cell of element.querySelectorAll<HTMLElement>('.rangepicker__cell')) {
      const { value } = cell.dataset;
      const cellDate = value ? new Date(value) : null;

      cell.classList.remove('rangepicker__selected-from');
      cell.classList.remove('rangepicker__selected-between');
      cell.classList.remove('rangepicker__selected-to');

      if (fromIso && value === fromIso) {
        cell.classList.add('rangepicker__selected-from');
      } else if (toIso && value === toIso) {
        cell.classList.add('rangepicker__selected-to');
      } else if (from && to && cellDate && cellDate >= from && cellDate <= to) {
        cell.classList.add('rangepicker__selected-between');
      }
    }

    if (fromIso) {
      const selectedFromElem = element.querySelector(`[data-value="${fromIso}"]`);
      if (selectedFromElem) {
        selectedFromElem.closest('.rangepicker__cell')?.classList.add('rangepicker__selected-from');
      }
    }

    if (toIso) {
      const selectedToElem = element.querySelector(`[data-value="${toIso}"]`);
      if (selectedToElem) {
        selectedToElem.closest('.rangepicker__cell')?.classList.add('rangepicker__selected-to');
      }
    }
  }

  private renderCalendar(showDate: Date): string {
    const date = new Date(showDate);
    const getGridStartIndex = (dayIndex: number): number => {
      const index = dayIndex === 0 ? 6 : (dayIndex - 1); // make Sunday (0) the last day
      return index + 1;
    };

    date.setDate(1);

    // text-transform: capitalize
    const monthStr = date.toLocaleString('ru', { month: 'long' });

    let table = `<div class="rangepicker__calendar">
      <div class="rangepicker__month-indicator">
        <time datetime=${monthStr}>${monthStr}</time>
      </div>
      <div class="rangepicker__day-of-week">
        <div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div><div>Пт</div><div>Сб</div><div>Вс</div>
      </div>
      <div class="rangepicker__date-grid">
    `;

    // first day of month starts after a space
    // * * * 1 2 3 4
    table += `
      <button type="button"
        class="rangepicker__cell"
        data-value="${date.toISOString()}"
        style="--start-from: ${getGridStartIndex(date.getDay())}">
          ${date.getDate()}
      </button>`;

    date.setDate(2);

    while (date.getMonth() === showDate.getMonth()) {
      table += `
        <button type="button"
          class="rangepicker__cell"
          data-value="${date.toISOString()}">
            ${date.getDate()}
        </button>`;

      date.setDate(date.getDate() + 1);
    }

    // close the table
    table += '</div></div>';

    return table;
  }

  private onRangePickerCellClick(target: HTMLElement): void {
    const { value } = target.dataset;

    if (!value) {
      return;
    }

    const dateValue = new Date(value);

    if (this.selectingFrom) {
      this.selected = {
        from: dateValue,
        to: null
      };
      this.selectingFrom = false;
      this.renderHighlight();
    } else {
      if (this.selected.from && dateValue > this.selected.from) {
        this.selected.to = dateValue;
      } else {
        this.selected.to = this.selected.from;
        this.selected.from = dateValue;
      }

      this.selectingFrom = true;
      this.renderHighlight();
    }

    if (this.selected.from && this.selected.to) {
      this.dispatchEvent();
      this.close();
      this.updateInputValues();
    }
  }

  private dispatchEvent(): void {
    this.element.dispatchEvent(new CustomEvent('date-select', {
      bubbles: true,
      detail: this.selected
    }));
  }

  remove(): void {
    const input = this.sub('input');
    const selector = this.sub('selector');

    this.element.remove();
    // TODO: Warning! To remove listener  MUST be passes the same event phase
    document.removeEventListener('click', this.onDocumentClick, true);
    input.removeEventListener('click', this.onInputClick);
    selector.removeEventListener('click', this.onSelectorClick);
  }

  destroy(): this {
    this.remove();
    this._element = null;
    this.selectingFrom = true;
    this.selected = {
      from: null,
      to: null
    };

    return this;
  }

  private updateInputValues(): void {
    const { from, to } = this.selected;
    if (!from || !to) {
      return;
    }

    const fromElement = this.sub('from');
    const toElement = this.sub('to');

    fromElement.innerHTML = RangePicker.formatDate(from);
    toElement.innerHTML = RangePicker.formatDate(to);
  }
}

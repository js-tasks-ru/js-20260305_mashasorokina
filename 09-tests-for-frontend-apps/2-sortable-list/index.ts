import { createElement } from "../../shared/utils/create-element";

export default class SortableList {
  element: HTMLElement;
  items: HTMLElement[];
  private draggingItem?: HTMLElement;
  private placeholder?: HTMLElement;
  private shiftX: number = 0;
  private shiftY: number = 0;

  constructor({ items = [] }: { items?: HTMLElement[] } = {}) {
    this.items = [...items];
    this.element = this.createElement();

    this.element.addEventListener('pointerdown', this.pointerdown.bind(this))
  }

  private pointerdown = (e: PointerEvent) => {
    const target = e.target as HTMLElement;
    if (!target) return;

    const item = target.closest('.sortable-list__item') as HTMLElement;

    if (!item) return;

    if (target.hasAttribute('data-delete-handle')  || target.closest('[data-delete-handle]')) {
      item.remove();
    } else if (target.hasAttribute('data-grab-handle') || target.closest('[data-grab-handle]')) {
      e.preventDefault();

      this.draggingItem = item;

      const { width, height, top, left } = this.draggingItem.getBoundingClientRect();
      this.shiftX = e.clientX - left;
      this.shiftY = e.clientY - top;

      this.placeholder = createElement(`
        <div class="sortable-list__placeholder"></div>
      `);
      this.placeholder.style.width = `${width}px`;
      this.placeholder.style.height = `${height}px`;
      this.draggingItem.after(this.placeholder);

      this.draggingItem.classList.add('sortable-list__item_dragging');
      this.draggingItem.style.width = `${width}px`;
      this.draggingItem.style.height = `${height}px`;
      this.draggingItem.style.position = 'fixed';
      this.draggingItem.style.left = `${left}px`;
      this.draggingItem.style.top = `${top}px`;

      document.addEventListener('pointermove', this.pointermove);
      document.addEventListener('pointerup', this.pointerup);
      document.addEventListener('pointercancel', this.pointerup);
    }
  }

  private pointermove = (e: PointerEvent) => {
    if (!this.draggingItem) return;

    this.draggingItem.style.left = `${e.clientX - this.shiftX}px`;
    this.draggingItem.style.top = `${e.clientY - this.shiftY}px`;

    this.draggingItem.style.pointerEvents = 'none';
    const elemsBelow = document.elementsFromPoint(e.clientX, e.clientY) as HTMLElement[];
    this.draggingItem.style.pointerEvents = '';

    const elemBelow = Array.from(elemsBelow).find(elem =>
      elem.classList.contains('sortable-list__item') &&
      elem !== this.draggingItem &&
      !elem.classList.contains('sortable-list__item_dragging')
    );

    if (!elemBelow) return;

    const droppable = elemBelow.closest('.sortable-list__item') as HTMLElement;

    if (!droppable || droppable === this.draggingItem) return;

    const { top, height } = droppable.getBoundingClientRect();
    const middle = top + height / 2;

    if (e.clientY < middle) {
      droppable.before(this.placeholder!);
    } else {
      droppable.after(this.placeholder!);
    }
  }

  private pointerup = (e: PointerEvent) => {
    if (this.draggingItem && this.placeholder) {
      this.draggingItem.classList.remove('sortable-list__item_dragging');
      this.draggingItem.style.position = '';
      this.draggingItem.style.left = '';
      this.draggingItem.style.top = '';
      this.draggingItem.style.width = '';
      this.draggingItem.style.height = '';
      this.placeholder.replaceWith(this.draggingItem);
    }

    document.removeEventListener('pointermove', this.pointermove);
    document.removeEventListener('pointerup', this.pointerup);
    document.removeEventListener('pointercancel', this.pointerup);

    this.draggingItem = undefined;
    this.placeholder = undefined;
  }

  private createElement() {
    const element = document.createElement("ul");
    this.items.forEach((item: HTMLElement) => {
      item.classList.add("sortable-list__item");
      element.append(item);
    });
    element.classList.add("sortable-list");
    return element;
  }

  remove() {
    this.element.removeEventListener("pointerdown", this.pointerdown);
    this.element.remove();
  }

  destroy() {
    this.remove();
  }
}

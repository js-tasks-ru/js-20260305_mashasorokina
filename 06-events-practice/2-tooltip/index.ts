class Tooltip {
  static instance: Tooltip | null = null;

  element: HTMLElement | null = null;

  private onPointerOver = (event: PointerEvent): void => {
    const target = event.target as HTMLElement | null;
    const element = target?.closest<HTMLElement>('[data-tooltip]');

    if (element) {
      this.render(element.dataset.tooltip ?? '');
      document.addEventListener('pointermove', this.onPointerMove);
    }
  };

  private onPointerMove = (event: PointerEvent): void => {
    this.moveTooltip(event);
  };

  private onPointerOut = (): void => {
    this.remove();
  };

  constructor() {
    if (Tooltip.instance) {
      return Tooltip.instance;
    }

    Tooltip.instance = this;
  }

  initialize(): void {
    this.initEventListeners();
  }

  private initEventListeners(): void {
    document.addEventListener('pointerover', this.onPointerOver);
    document.addEventListener('pointerout', this.onPointerOut);
  }

  render(html: string): void {
    this.element = document.createElement('div');
    this.element.className = 'tooltip';
    this.element.innerHTML = html;

    document.body.append(this.element);
  }

  private moveTooltip(event: PointerEvent): void {
    if (!this.element) {
      return;
    }

    const shift = 10;
    const left = event.clientX + shift;
    const top = event.clientY + shift;

    // TODO: Add logic for window borders

    this.element.style.left = `${left}px`;
    this.element.style.top = `${top}px`;
  }

  remove(): void {
    this.element?.remove();
  }

  destroy(): void {
    document.removeEventListener('pointerover', this.onPointerOver);
    document.removeEventListener('pointerout', this.onPointerOut);
    document.removeEventListener('pointermove', this.onPointerMove);
    this.remove();
    this.element = null;
  }
}

export default Tooltip;

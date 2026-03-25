import { createElement } from "../../shared/utils/create-element";

interface NotificationMessageOptions {
  duration?: number;
  type?: string;
}

export default class NotificationMessage {
  private static activeNotification: NotificationMessage | null = null;

  private _element: HTMLElement | null = null;

  private message: string;
  private durationInSeconds: string;
  private type: string;
  private duration: number;
  private removeTimerId: number | null = null;

  constructor(message: string, {
    duration = 2000,
    type = 'success',
  }: NotificationMessageOptions = {}) {
    NotificationMessage.activeNotification?.destroy();

    this.message = message;
    this.durationInSeconds = (duration / 1000) + 's';
    this.type = type;
    this.duration = duration;

    this.render();
  }

  get element(): HTMLElement {
    if (!this._element) {
      throw new Error("Element has been destroyed or not rendered");
    }
    return this._element;
  }

  get template(): string {
    return `<div class="notification ${this.type}" style="--value:${this.durationInSeconds}">
      <div class="timer"></div>
      <div class="inner-wrapper">
        <div class="notification-header">Notification</div>
        <div class="notification-body">
          ${this.message}
        </div>
      </div>
    </div>`;
  }

  private render(): void {
    NotificationMessage.activeNotification = this;

    this._element = createElement(this.template);
  }

  show(parent: HTMLElement = document.body): void {
    parent.append(this.element);

    if (this.removeTimerId !== null) {
      window.clearTimeout(this.removeTimerId);
    }

    this.removeTimerId = window.setTimeout(() => {
      this.remove();
    }, this.duration);
  }

  remove(): void {
    this._element?.remove();
    if (NotificationMessage.activeNotification === this) {
      NotificationMessage.activeNotification = null;
    }
  }

  destroy(): void {
    if (this.removeTimerId !== null) {
      window.clearTimeout(this.removeTimerId);
      this.removeTimerId = null;
    }

    this.remove();
    this._element = null;
  }
}

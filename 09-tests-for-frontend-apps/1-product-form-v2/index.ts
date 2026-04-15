import { escapeHtml } from '../../shared/utils/escape-html';
import { fetchJson } from '../../shared/utils/fetch-json';
import { createElement } from "../../shared/utils/create-element";
import SortableList from "../2-sortable-list";

const IMGUR_CLIENT_ID = '28aaa2e823b03b1';
const IMGUR_URL = 'https://api.imgur.com/3/image';
const BACKEND_URL = 'https://course-js.javascript.ru';
const CATEGORIES_LIST_URL = '/api/rest/categories?_sort=weight&_refs=subcategory';
const GET_PRODUCT_DATA_URL = '/api/rest/products';
const SAVE_PRODUCT_DATA_URL = '/api/rest/products';

interface ProductImage {
  url: string;
  source: string;
}

interface ImgurUploadResponse {
  data: {
    link: string;
  };
}

interface Category {
  id: string;
  title: string;
  count: number;
  weight: number;
  subcategories: Category[];
}

interface Product {
  id?: string;
  title: string;
  description: string;
  images: ProductImage[];
  price: number;
  discount: number;
  subcategory: string;
  quantity: number;
  status: number;
}

interface SelectOption {
  label: string;
  value: number | string;
}

export default class ProductForm {
  productId?: string;
  element!: HTMLElement;
  private categories?: Category[];
  private product?: Product;
  private uploadButton?: HTMLButtonElement;
  private imagesContainer?: HTMLDivElement;

  constructor(productId?: string) {
    this.productId = productId;
  }

  async render(): Promise<HTMLElement | null> {
    this.categories = await fetchJson(`${BACKEND_URL}${CATEGORIES_LIST_URL}`);
    if (this.productId) {
      const products = await fetchJson(`${BACKEND_URL}${GET_PRODUCT_DATA_URL}?id=${this.productId}`) as Product[];
      if (products?.length > 0) {
        this.product = products[0];
      }
    }
    this.element = createElement(this.template);

    if (this.product?.images?.length) {
      const imagesContainer = this.element.querySelector('[data-element="imageListContainer"]') as HTMLDivElement;
      const imagesList = new SortableList({
        items: this.product.images.map(image => {
          return createElement(this.imageTemplate(image));
        })
      });
      imagesContainer.append(imagesList.element);
    }

    this.element.addEventListener('submit', this.save.bind(this));
    this.imagesContainer = this.element.querySelector('[data-element="imageListContainer"]') as HTMLDivElement;

    this.uploadButton = this.element.querySelector('[name="uploadImage"]') as HTMLButtonElement;
    if (this.uploadButton) {
      this.uploadButton?.addEventListener('click', this.uploadFile);
    }

    return this.element;
  }

  private get template() {
    return `
      <div class="product-form">
        <form data-element="productForm" class="form-grid">
          <div class="form-group form-group__half_left">
            <fieldset>
               ${this.labelTemplate('Название товара')}
               ${this.inputTemplate({name: 'title', required: true, placeholder: 'Название товара', value: this.product?.title})}
            </fieldset>
          </div>
          <div class="form-group form-group__wide">
            ${this.labelTemplate('Описание')}
            ${this.textareaTemplate({name: 'description', required: true, dataElement: 'productDescription', placeholder: 'Описание товара', value: this.product?.description})}
          </div>
          <div class="form-group form-group__wide" data-element="sortable-list-container">
            ${this.labelTemplate('Фото')}
            <div data-element="imageListContainer"></div>
            <button type="button" name="uploadImage" class="button-primary-outline fit-content"><span>Загрузить</span></button>
          </div>
          ${this.categoriesSelectTemplate}
          <div class="form-group form-group__half_left form-group__two-col">
            <fieldset>
              ${this.labelTemplate('Цена ($)')}
              ${this.inputTemplate({name: 'price', required: true, placeholder: '100', type: 'number', value: this.product?.price?.toString()})}
            </fieldset>
            <fieldset>
              ${this.labelTemplate('Скидка ($)')}
              ${this.inputTemplate({name: 'discount', required: true, placeholder: '0', type: 'number', value: this.product?.discount?.toString()})}
            </fieldset>
          </div>
          <div class="form-group form-group__part-half">
            ${this.labelTemplate('Количество')}
            ${this.inputTemplate({name: 'quantity', required: true, placeholder: '1', type: 'number', value: this.product?.quantity?.toString()})}
          </div>
          <div class="form-group form-group__part-half">
            ${this.labelTemplate('Статус')}
            ${this.selectTemplate({
      name: 'status',
      values: [{ label: 'Активен', value: 1 }, { label: 'Неактивен', value: 0 }],
      selected: this.product?.status}
    )}
          </div>
          <div class="form-buttons">
            <button type="submit" name="save" class="button-primary-outline">
              Сохранить товар
            </button>
          </div>
        </form>
      </div>
    `;
  }

  private labelTemplate(label: string): string {
    return `<label class="form-label">${label}</label>`;
  }

  private inputTemplate({ name = '', required = false, placeholder = '', type = 'text', value = '' } = {}): string {
    return `
      <input ${required ? 'required' : ''} type="${type}" name="${name}" id="${name}" class="form-control" placeholder="${placeholder}" value="${escapeHtml(value)}">
    `;
  }

  private textareaTemplate({ name = '', required = false, placeholder = '', dataElement = '', value = '' } = {}) {
    return `
      <textarea ${required ? 'required' : ''} class="form-control" name="${name}" data-element="${dataElement}" placeholder="${placeholder}">${escapeHtml(value)}</textarea>
    `;
  }

  private imageTemplate(productImage: ProductImage): string {
    return `
      <li class="products-edit__imagelist-item" >
          <input type="hidden" name="url" value="${productImage.url}">
          <input type="hidden" name="source" value="${productImage.source}">
          <span data-grab-handle>
              <img src="icon-grab.svg" data-grab-handle="" alt="grab">
              <img class="sortable-table__cell-img" alt="Image" src="${productImage.url}">
              <span>${productImage.source}</span>
          </span>
          <button type="button" data-delete-handle>
            <img src="icon-trash.svg" data-delete-handle="" alt="delete">
          </button>
        </li>
    `;
  }

  private get categoriesSelectTemplate() {
    if (!this.categories?.length) return '';

    const options: string[] = [];
    this.categories.forEach(category => {
      if (!category.subcategories?.length) {
        options.push(`<option value="${category.id}">${category.title}</option>`);
      } else {
        category.subcategories.forEach(subcategory => {
          options.push(`<option value="${subcategory.id}">${category.title} &gt; ${subcategory.title}</option>`);
        });
      }
    });

    return `
       <div class="form-group form-group__half_left">
        ${this.labelTemplate('Категория')}
        <select class="form-control" name="subcategory" id="subcategory">${options.join('')}</select>
      </div>
    `;
  }

  private selectTemplate({name = '', values = [], selected}: {
    name?: string;
    values?: SelectOption[];
    selected?: number | string;
  } = {}) {
    if (!values.length) return '';

    const options: string[] = [];
    values.forEach(val => {
      options.push(`<option value="${val.value}" ${val.value === selected ? 'selected' : ''}>${val.label}</option>`);
    });
    return `<select class="form-control" name="${name}">${options.join('')}</select>`;
  }

  async save(event?: SubmitEvent): Promise<void> {
    event?.preventDefault();

    const form = this.element?.querySelector('[data-element="productForm"]') as HTMLFormElement;
    let formData = new FormData(form);

    try {
      const response = await fetch(`${BACKEND_URL}${SAVE_PRODUCT_DATA_URL}`, {
        method: 'POST',
        body: JSON.stringify(this.createRequestBody(formData))
      });

      this.dispatchEvent();
    } catch (error) {
      console.error('Ошибка сохранения продукта:', error);
    }
  }

  private createRequestBody(formData: FormData): Product {
    const images: ProductImage[] = [];
    const urls = formData.getAll('url') as string[];
    const sources = formData.getAll('source') as string[];

    for (let i = 0; i < urls.length; i++) {
      images.push({
        url: urls[i],
        source: sources[i]
      })
    }

    return {
      id: this.productId,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      images,
      price: Number(formData.get('price') as string),
      discount: Number(formData.get('discount') as string),
      subcategory: formData.get('subcategory') as string,
      quantity: Number(formData.get('quantity') as string),
      status: Number(formData.get('status') as string),
    };
  }

  private dispatchEvent = () =>{
    const customEvent = this.productId
      ? new CustomEvent('product-updated', { detail: this.productId })
      : new CustomEvent('product-saved');
    this.element!.dispatchEvent(customEvent);
  }

  private uploadFile =  ()=> {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.addEventListener('change', async (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];

      if (!file) return;

      const formData = new FormData();
      formData.append('image', file);

      if (file) {
        this.uploadButton!.classList.add('is-loading');

        const response = await fetch(IMGUR_URL, {
          method: 'POST',
          headers: {
            Authorization: `Client-ID ${IMGUR_CLIENT_ID}`
          },
          body: formData
        });


        if (response.ok) {
          const data = await response.json();

          // не знаю формат ответа, сервис возвращает ошибку 400 bad request
          const newImage = createElement(this.imageTemplate({
            url: '',
            source: '',
          }));
          this.imagesContainer?.append(newImage);
        }

        this.uploadButton!.classList.remove('is-loading');
      }
    });

    input.click();
  }

  remove() {
    this.element?.remove();
  }

  destroy() {
    this.element?.removeEventListener('submit', this.save);
    this.uploadButton?.removeEventListener('click', this.uploadFile);
    this.remove();
  }
}

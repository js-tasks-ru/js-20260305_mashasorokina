import { escapeHtml } from '../../shared/utils/escape-html';
import { fetchJson } from '../../shared/utils/fetch-json';
import { createElement } from '../../shared/utils/create-element';
import { required } from '../../shared/utils/required';

const IMGUR_CLIENT_ID = '28aaa2e823b03b1';
const BACKEND_URL = 'https://course-js.javascript.ru';

interface ProductImage {
  url: string;
  source: string;
}

interface ProductFormData {
  id?: string | null;
  title: string;
  description: string;
  quantity: number;
  subcategory: string;
  status: number;
  images: ProductImage[];
  price: number;
  discount: number;
  [key: string]: unknown;
}

interface Category {
  id: string;
  title: string;
  subcategories: Subcategory[];
  [key: string]: unknown;
}

interface Subcategory {
  id: string;
  title: string;
  [key: string]: unknown;
}

interface ImgurUploadResponse {
  data: {
    link: string;
  };
}

interface ProductSaveResponse {
  id: string;
}

type FormFieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export default class ProductForm {
  private _element: HTMLElement | null = null;
  private defaultFormData: ProductFormData = {
    title: '',
    description: '',
    quantity: 1,
    subcategory: '',
    status: 1,
    images: [],
    price: 100,
    discount: 0
  };
  private formData: ProductFormData | null = null;
  private categories: Category[] = [];
  private productId?: string;

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

  private onSubmit = (event: SubmitEvent): void => {
    event.preventDefault();

    this.save();
  };

  private onImageListClick = (event: Event): void => {
    const target = event.target as HTMLElement | null;

    if (target && 'deleteHandle' in target.dataset) {
      target.closest('li')?.remove();
    }
  };

  private uploadImage = (): void => {
    const fileInput = document.createElement('input');

    fileInput.type = 'file';
    fileInput.accept = 'image/*';

    fileInput.addEventListener('change', async () => {
      const [file] = fileInput.files ?? [];

      if (!file) {
        fileInput.remove();
        return;
      }

      const formData = new FormData();
      const uploadImage = this.sub<HTMLButtonElement>('uploadImage');
      const imageListContainer = this.sub('imageListContainer');

      formData.append('image', file);

      uploadImage.classList.add('is-loading');
      uploadImage.disabled = true;

      try {
        const result = await fetchJson<ImgurUploadResponse>('https://api.imgur.com/3/image', {
          method: 'POST',
          headers: {
            Authorization: `Client-ID ${IMGUR_CLIENT_ID}`,
          },
          body: formData
        });

        const imageItem = this.getImageItem(result.data.link, file.name);

        if (imageItem) {
          imageListContainer.append(imageItem);
        }
      } catch (error) {
        console.error('image upload failed', error);
      } finally {
        uploadImage.classList.remove('is-loading');
        uploadImage.disabled = false;
        fileInput.remove();
      }
    });

    fileInput.click();
  };

  constructor(productId?: string) {
    this.productId = productId;
  }

  get template(): string {
    return `
      <div class="product-form">

      <form data-element="productForm" class="form-grid">
        <div class="form-group form-group__half_left">
          <fieldset>
            <label class="form-label">Название товара</label>
            <input required
              id="title"
              value=""
              type="text"
              name="title"
              class="form-control"
              placeholder="Название товара">
          </fieldset>
        </div>

        <div class="form-group form-group__wide">
          <label class="form-label">Описание</label>
          <textarea required
            id="description"
            class="form-control"
            name="description"
            data-element="productDescription"
            placeholder="Описание товара"></textarea>
        </div>

        <div class="form-group form-group__wide">
          <label class="form-label">Фото</label>

          <ul class="sortable-list" data-element="imageListContainer">
            ${this.createImagesList()}
          </ul>

          <button data-element="uploadImage" type="button" class="button-primary-outline">
            <span>Загрузить</span>
          </button>
        </div>

        <div class="form-group form-group__half_left">
          <label class="form-label">Категория</label>
            ${this.createCategoriesSelect()}
        </div>

        <div class="form-group form-group__half_left form-group__two-col">
          <fieldset>
            <label class="form-label">Цена ($)</label>
            <input required
              id="price"
              value=""
              type="number"
              name="price"
              class="form-control"
              placeholder="${this.defaultFormData.price}">
          </fieldset>
          <fieldset>
            <label class="form-label">Скидка ($)</label>
            <input required
              id="discount"
              value=""
              type="number"
              name="discount"
              class="form-control"
              placeholder="${this.defaultFormData.discount}">
          </fieldset>
        </div>

        <div class="form-group form-group__part-half">
          <label class="form-label">Количество</label>
          <input required
            id="quantity"
            value=""
            type="number"
            class="form-control"
            name="quantity"
            placeholder="${this.defaultFormData.quantity}">
        </div>

        <div class="form-group form-group__part-half">
          <label class="form-label">Статус</label>
          <select id="status" class="form-control" name="status">
            <option value="1">Активен</option>
            <option value="0">Неактивен</option>
          </select>
        </div>

        <div class="form-buttons">
          <button type="submit" name="save" class="button-primary-outline">
            ${this.productId ? "Сохранить" : "Добавить"} товар
          </button>
        </div>
      </form>
    </div>
    `;
  }

  async render(): Promise<HTMLElement | null> {
    const categoriesPromise = this.loadCategoriesList();

    const productPromise = this.productId
      ? this.loadProductData(this.productId)
      : [this.defaultFormData];

    const [categoriesData, productResponse] = await Promise.all([categoriesPromise, productPromise]);
    const [productData] = productResponse;

    this.formData = productData ?? null;
    this.categories = categoriesData;

    this.renderForm();

    if (this.formData) {
      this.setFormData();
      this.initEventListeners();
    }

    return this.element;
  }

  renderForm(): void {
    this._element = createElement(
      this.formData ? this.template : this.getEmptyTemplate()
    );
  }

  getEmptyTemplate(): string {
    return `<div>
      <h1 class="page-title">Страница не найдена</h1>
      <p>Извините, данный товар не существует</p>
    </div>`;
  }

  async save(): Promise<void> {
    const product = this.getFormData();

    try {
      const result = await fetchJson<ProductSaveResponse>(`${BACKEND_URL}/api/rest/products`, {
        method: this.productId ? 'PATCH' : 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(product)
      });

      this.dispatchEvent(result.id);
    } catch (error) {
      console.error('something went wrong', error);
    }
  }

  getFormData(): ProductFormData {
    const productForm = this.sub<HTMLFormElement>('productForm');
    const imageListContainer = this.sub('imageListContainer');
    const excludedFields = ['images'];
    const formatToNumber = ['price', 'quantity', 'discount', 'status'];
    const fields = Object.keys(this.defaultFormData)
      .filter(item => !excludedFields.includes(item)) as Array<keyof ProductFormData>;
    const values: ProductFormData = {
      ...this.defaultFormData,
      images: [],
      id: this.productId ?? null
    };

    for (const field of fields) {
      const input = productForm.querySelector<FormFieldElement>(`#${String(field)}`);

      if (!input) {
        continue;
      }

      if (formatToNumber.includes(String(field))) {
        const fallback = this.defaultFormData[field] as number;
        values[field] = this.getNumericValue(input.value, fallback);
      } else {
        values[field] = input.value;
      }
    }

    const imagesHTMLCollection = imageListContainer.querySelectorAll<HTMLImageElement>(
      '.sortable-table__cell-img'
    );

    for (const image of imagesHTMLCollection) {
      values.images.push({
        url: image.src,
        source: image.alt
      });
    }

    return values;
  }

  dispatchEvent(id: string): void {
    const event = this.productId
      ? new CustomEvent('product-updated', { detail: id })
      : new CustomEvent('product-saved');

    this.element.dispatchEvent(event);
  }

  setFormData(): void {
    const productForm = this.sub<HTMLFormElement>('productForm');
    const excludedFields = ['images'];
    const fields = Object.keys(this.defaultFormData)
      .filter(item => !excludedFields.includes(item)) as Array<keyof ProductFormData>;

    fields.forEach(item => {
      const element = productForm.querySelector<FormFieldElement>(`#${String(item)}`);

      if (element) {
        const value = this.formData?.[item] ?? this.defaultFormData[item];
        element.value = String(value);
      }
    });
  }

  loadProductData(productId: string): Promise<ProductFormData[]> {
    return fetchJson<ProductFormData[]>(`${BACKEND_URL}/api/rest/products?id=${productId}`);
  }

  loadCategoriesList(): Promise<Category[]> {
    return fetchJson<Category[]>(`${BACKEND_URL}/api/rest/categories?_sort=weight&_refs=subcategory`);
  }

  createCategoriesSelect(): string {
    const wrapper = document.createElement('div');

    wrapper.innerHTML = `<select class="form-control" id="subcategory" name="subcategory"></select>`;

    const select = wrapper.firstElementChild as HTMLSelectElement | null;

    if (!select) {
      return '';
    }

    for (const category of this.categories) {
      for (const child of category.subcategories) {
        select.append(new Option(`${category.title} > ${child.title}`, child.id));
      }
    }

    return select.outerHTML;
  }

  createImagesList(): string {
    const images = this.formData?.images ?? [];

    return images.map(item => {
      return this.getImageItem(item.url, item.source)?.outerHTML ?? '';
    }).join('');
  }

  getImageItem(url: string, name: string): HTMLLIElement | null {
    const wrapper = document.createElement('div');

    wrapper.innerHTML = `
      <li class="products-edit__imagelist-item sortable-list__item">
        <span>
          <img src="./icon-grab.svg" data-grab-handle alt="grab">
          <img class="sortable-table__cell-img" alt="${escapeHtml(name)}" src="${escapeHtml(url)}">
          <span>${escapeHtml(name)}</span>
        </span>

        <button type="button">
          <img src="./icon-trash.svg" alt="delete" data-delete-handle>
        </button>
      </li>`;

    return wrapper.firstElementChild as HTMLLIElement | null;
  }

  initEventListeners(): void {
    const productForm = this.sub<HTMLFormElement>('productForm');
    const uploadImage = this.sub<HTMLButtonElement>('uploadImage');
    const imageListContainer = this.sub('imageListContainer');

    productForm.addEventListener('submit', this.onSubmit);
    uploadImage.addEventListener('click', this.uploadImage);

    /* TODO: will be removed in the next iteration of realization.
       this logic will be implemented inside "SortableList" component
    */
    imageListContainer.addEventListener('click', this.onImageListClick);
  }

  private getNumericValue(value: string, fallback: number): number {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private removeEventListeners(): void {
    const productForm = this.sub<HTMLFormElement>('productForm');
    const uploadImage = this.sub<HTMLButtonElement>('uploadImage');
    const imageListContainer = this.sub('imageListContainer');

    productForm.removeEventListener('submit', this.onSubmit);
    uploadImage.removeEventListener('click', this.uploadImage);
    imageListContainer.removeEventListener('click', this.onImageListClick);
  }

  destroy(): void {
    this.removeEventListeners();
    this.remove();
    this._element = null;
  }

  remove(): void {
    this.element.remove();
  }
}

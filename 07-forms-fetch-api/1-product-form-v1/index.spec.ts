import ProductForm from './index';

import productData from './__mocks__/product-data';
import categoriesData from './__mocks__/categories-data';

describe('forms-fetch-api-part-2/product-form-v1', () => {
  let productId: string;
  let productFormComponent: ProductForm;


  beforeEach(async () => {
    fetchMock
      .once(JSON.stringify(categoriesData))
      .once(JSON.stringify(productData));

    productId = 'some-id';

    productFormComponent = new ProductForm(productId);

    const element = await productFormComponent.render();

    if (!element) {
      throw new Error('ProductForm element was not rendered');
    }

    document.body.append(element);
  });

  afterEach(() => {
    fetchMock.resetMocks();
    productFormComponent.destroy();
  });

  it('should be rendered correctly', () => {
    expect(productFormComponent.element).toBeVisible();
    expect(productFormComponent.element).toBeInTheDocument();
  });

  it('should render categories data correctly', () => {
    const subcategory = productFormComponent.element?.querySelector('#subcategory');

    if (!subcategory) {
      throw new Error('Subcategory select not found');
    }

    function prepareCategoryName () {
      const names: string[] = [];

      for (const category of categoriesData) {
        for (const child of category.subcategories) {
          names.push(`${category.title} > ${child.title}`);
        }
      }

      return names;
    }

    const categoriesNames = prepareCategoryName();

    expect(subcategory.children[0]).toHaveTextContent(categoriesNames[0]);
    expect(subcategory.children[subcategory.children.length - 1])
      .toHaveTextContent(categoriesNames[categoriesNames.length - 1]);
  });

  it('should render product data correctly', () => {
    const productForm = productFormComponent.element?.querySelector<HTMLFormElement>('[data-element="productForm"]');
    const imageListContainer = productFormComponent.element?.querySelector<HTMLElement>('[data-element="imageListContainer"]');

    if (!productForm || !imageListContainer) {
      throw new Error('ProductForm sub elements not found');
    }

    const defaultFormData = {
      title: '',
      description: '',
      quantity: 1,
      subcategory: '',
      status: 1,
      price: 100,
      discount: 0
    };

    const fields = Object.keys(defaultFormData);
    const values = {} as Record<string, string> & {
      images: Array<{ url: string; source: string }>;
      id?: string;
    };

    for (const field of fields) {
      const input = productForm.querySelector<HTMLInputElement>(`#${field}`);

      if (input) {
        values[field] = input.value;
      }
    }

    const imagesHTMLCollection = imageListContainer.querySelectorAll('.sortable-table__cell-img');

    values.images = [];
    values.id = productId;

    for (const image of imagesHTMLCollection) {
      values.images.push({
        url: (image as HTMLImageElement).src,
        source: (image as HTMLImageElement).alt
      });
    }

    expect(values.id).toBe('some-id');
    expect(values.title).toBe('10.1" Планшет Lenovo Tab E10 TB-X104L 32 ГБ 3G, LTE черный');
    expect(values.quantity).toBe('73');
    expect(values.price).toBe('10');
    expect(values.discount).toBe('21');
    expect(values.images[0].url).toBe('https://shop-image.js.cx/101-planset-lenovo-tab-e10-tb-x104l-32-gb-3g-lte-cernyj-8.jpg');
  });

  it('should dispatch "product-updated" event after product creating', async () => {
    const spyDispatchEvent = vi.spyOn(productFormComponent.element!, 'dispatchEvent');

    fetchMock
      .once(JSON.stringify({status: 'ok'}));

    await productFormComponent.save();

    const [event] = spyDispatchEvent.mock.calls;

    expect(event[0].type).toEqual('product-updated');
  });

  it('should have ability to be removed', () => {
    productFormComponent.remove();

    expect(productFormComponent.element).not.toBeInTheDocument();
  });
});

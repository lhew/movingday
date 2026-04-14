import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentFactory, Spectator } from '@ngneat/spectator/vitest';
import { ItemFormComponent } from './item-form.component';
import { ItemsService } from '../../../shared/services/items.service';
import { ImageUploadService } from '../../../shared/services/image-upload.service';
import { Item } from '../../../shared/models/item.model';
import { Timestamp } from '@angular/fire/firestore';
import * as firestore from 'firebase/firestore';

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    deleteField: vi.fn().mockReturnValue('__DELETE_FIELD__'),
  };
});

const mockItem: Item = {
  id: 'item-1',
  name: 'Test Chair',
  description: 'A really nice chair for sitting on',
  condition: 'good',
  status: 'available',
  imageUrl: 'https://example.com/chair.jpg',
  category: 'Furniture',
  tags: ['chair', 'wood'],
  createdAt: { toDate: () => new Date() } as Timestamp,
};

const mockPricedItem: Item = {
  ...mockItem,
  id: 'item-2',
  price: 599,
};

describe('ItemFormComponent', () => {
  let spectator: Spectator<ItemFormComponent>;
  let mockItemsService: Partial<ItemsService>;
  let mockImageUploadService: Partial<ImageUploadService>;

  const createComponent = createComponentFactory({
    component: ItemFormComponent,
    providers: [
      { provide: ItemsService, useValue: { createItem: vi.fn(), updateItem: vi.fn() } },
      { provide: ImageUploadService, useValue: { resizeAndUploadImages: vi.fn() } },
    ],
  });

  beforeEach(() => {
    vi.clearAllMocks();

    spectator = createComponent();

    mockItemsService = spectator.inject(ItemsService) as Partial<ItemsService>;
    mockImageUploadService = spectator.inject(ImageUploadService) as Partial<ImageUploadService>;

    vi.mocked(mockItemsService.createItem!).mockResolvedValue('new-id');
    vi.mocked(mockItemsService.updateItem!).mockResolvedValue(undefined);
    vi.mocked(mockImageUploadService.resizeAndUploadImages!).mockResolvedValue({ sm: 'https://storage.example.com/img.jpg', lg: 'https://storage.example.com/img-lg.jpg' });
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  // ── create mode ─────────────────────────────────────────────────────────────

  describe('create mode (no item input)', () => {
    it('should initialise form fields as empty', () => {
      expect(spectator.component.form.value.name).toBe('');
      expect(spectator.component.form.value.description).toBe('');
      expect(spectator.component.form.value.imageUrl).toBe('');
      expect(spectator.component.form.value.category).toBe('');
      expect(spectator.component.form.value.tags).toBe('');
    });

    it('should default condition to "good" and status to "available"', () => {
      expect(spectator.component.form.value.condition).toBe('good');
      expect(spectator.component.form.value.status).toBe('available');
    });

    it('isEditing should be false', () => {
      expect(spectator.component.isEditing).toBe(false);
    });
  });

  // ── edit mode ────────────────────────────────────────────────────────────────

  describe('edit mode (item input provided)', () => {
    beforeEach(() => {
      spectator = createComponent({ props: { item: mockItem } });
      mockItemsService = spectator.inject(ItemsService) as Partial<ItemsService>;
      mockImageUploadService = spectator.inject(ImageUploadService) as Partial<ImageUploadService>;
    });

    it('should populate form fields from the item', () => {
      expect(spectator.component.form.value.name).toBe('Test Chair');
      expect(spectator.component.form.value.description).toBe('A really nice chair for sitting on');
      expect(spectator.component.form.value.condition).toBe('good');
      expect(spectator.component.form.value.status).toBe('available');
      expect(spectator.component.form.value.imageUrl).toBe('https://example.com/chair.jpg');
      expect(spectator.component.form.value.category).toBe('Furniture');
      expect(spectator.component.form.value.tags).toBe('chair, wood');
    });

    it('should set the image preview to the existing imageUrl', () => {
      expect(spectator.component.imagePreview()).toBe('https://example.com/chair.jpg');
    });

    it('isEditing should be true', () => {
      expect(spectator.component.isEditing).toBe(true);
    });

    it('should default pricing to "free" when item has no price', () => {
      expect(spectator.component.form.value.pricing).toBe('free');
    });
  });

  describe('edit mode (priced item)', () => {
    beforeEach(() => {
      spectator = createComponent({ props: { item: mockPricedItem } });
      mockItemsService = spectator.inject(ItemsService) as Partial<ItemsService>;
    });

    it('should set pricing to "priced" and format the price', () => {
      expect(spectator.component.form.value.pricing).toBe('priced');
      expect(spectator.component.form.value.price).toBe('5,99');
    });

    it('price field should have required validator set', () => {
      expect(spectator.component.form.get('price')?.errors).toBeNull(); // value "5,99" is valid
    });
  });

  // ── form validation ──────────────────────────────────────────────────────────

  describe('form validation', () => {
    it('should be invalid when name is empty', () => {
      spectator.component.form.patchValue({ name: '', description: 'Long enough description here.' });
      expect(spectator.component.form.get('name')?.errors?.['required']).toBeTruthy();
    });

    it('should be invalid when name is shorter than 2 characters', () => {
      spectator.component.form.patchValue({ name: 'X' });
      expect(spectator.component.form.get('name')?.errors?.['minlength']).toBeTruthy();
    });

    it('should be invalid when description is shorter than 10 characters', () => {
      spectator.component.form.patchValue({ description: 'Too short' });
      expect(spectator.component.form.get('description')?.errors?.['minlength']).toBeTruthy();
    });

    it('should be invalid when category is empty', () => {
      spectator.component.form.patchValue({
        name: 'Nice chair',
        description: 'A comfortable wooden chair in good shape.',
        category: '',
        tags: 'chair',
      });
      expect(spectator.component.form.get('category')?.errors?.['required']).toBeTruthy();
    });

    it('should be invalid when tags are empty', () => {
      spectator.component.form.patchValue({
        name: 'Nice chair',
        description: 'A comfortable wooden chair in good shape.',
        category: 'Furniture',
        tags: '',
      });
      expect(spectator.component.form.get('tags')?.errors?.['required']).toBeTruthy();
    });

    it('should be valid when all required fields are filled', () => {
      spectator.component.form.patchValue({
        name: 'Nice chair',
        description: 'A comfortable wooden chair in good shape.',
        category: 'Furniture',
        tags: 'chair',
      });
      expect(spectator.component.form.valid).toBe(true);
    });

    it('should be invalid when category has unsupported characters', () => {
      spectator.component.form.patchValue({
        name: 'Nice chair',
        description: 'A comfortable wooden chair in good shape.',
        category: 'Furniture!',
      });

      expect(spectator.component.form.get('category')?.errors?.['pattern']).toBeTruthy();
      expect(spectator.component.form.valid).toBe(false);
    });

    it('should be invalid when tags are not a valid comma-separated list', () => {
      spectator.component.form.patchValue({
        name: 'Nice chair',
        description: 'A comfortable wooden chair in good shape.',
        tags: 'chair, ,wood',
      });

      expect(spectator.component.form.get('tags')?.errors?.['pattern']).toBeTruthy();
      expect(spectator.component.form.valid).toBe(false);
    });

    it('should be valid when tags are a valid comma-separated list', () => {
      spectator.component.form.patchValue({
        name: 'Nice chair',
        description: 'A comfortable wooden chair in good shape.',
        category: 'Furniture',
        tags: 'chair,wood-table,ikea',
      });

      expect(spectator.component.form.get('tags')?.errors).toBeNull();
      expect(spectator.component.form.valid).toBe(true);
    });

    it('should disable submit when form is invalid', () => {
      spectator.component.form.patchValue({ name: '', description: '', category: '', tags: '' });
      spectator.detectChanges();

      const submitBtn = spectator.query('button[type="submit"]') as HTMLButtonElement;
      expect(submitBtn.disabled).toBe(true);
    });

    it('should enable submit when all required fields are valid', () => {
      spectator.component.form.patchValue({
        name: 'Nice chair',
        description: 'A comfortable wooden chair in good shape.',
        category: 'Furniture',
        tags: 'chair',
      });
      spectator.detectChanges();

      const submitBtn = spectator.query('button[type="submit"]') as HTMLButtonElement;
      expect(submitBtn.disabled).toBe(false);
    });
  });

  // ── pricing ──────────────────────────────────────────────────────────────────

  describe('pricing', () => {
    it('should default pricing to "free"', () => {
      expect(spectator.component.form.value.pricing).toBe('free');
    });

    it('price field should have no validators when pricing is "free"', () => {
      spectator.component.onPricingChange('free');
      spectator.component.form.get('price')!.setValue('');
      expect(spectator.component.form.get('price')?.errors).toBeNull();
    });

    it('price field should be required when pricing is "priced"', () => {
      spectator.component.onPricingChange('priced');
      expect(spectator.component.form.get('price')?.errors?.['required']).toBeTruthy();
    });

    it('price field should be invalid with an incorrect format', () => {
      spectator.component.onPricingChange('priced');
      spectator.component.form.get('price')!.setValue('5.99');
      expect(spectator.component.form.get('price')?.errors?.['pattern']).toBeTruthy();
    });

    it('price field should be valid with correct euro format', () => {
      spectator.component.onPricingChange('priced');
      spectator.component.form.get('price')!.setValue('5,99');
      expect(spectator.component.form.get('price')?.errors).toBeNull();
    });

    it('onPricingChange("free") should clear the price value', () => {
      spectator.component.onPricingChange('priced');
      spectator.component.form.get('price')!.setValue('5,99');
      spectator.component.onPricingChange('free');
      expect(spectator.component.form.get('price')!.value).toBe('');
    });

    it('onPriceInput should format "599" as "5,99"', () => {
      spectator.component.onPricingChange('priced');
      const input = document.createElement('input');
      input.value = '599';
      spectator.component.onPriceInput({ target: input } as unknown as Event);
      expect(input.value).toBe('5,99');
      expect(spectator.component.form.get('price')!.value).toBe('5,99');
    });

    it('onPriceInput should format a single digit as leading-zero cents', () => {
      spectator.component.onPricingChange('priced');
      const input = document.createElement('input');
      input.value = '9';
      spectator.component.onPriceInput({ target: input } as unknown as Event);
      expect(input.value).toBe('0,09');
    });

    it('onPriceInput should handle "1250" as "12,50"', () => {
      spectator.component.onPricingChange('priced');
      const input = document.createElement('input');
      input.value = '1250';
      spectator.component.onPriceInput({ target: input } as unknown as Event);
      expect(input.value).toBe('12,50');
    });
  });

  // ── save() — create ──────────────────────────────────────────────────────────

  describe('save() — create', () => {
    beforeEach(() => {
      spectator.component.form.patchValue({
        name: 'New Lamp',
        description: 'A very bright and modern lamp.',
        condition: 'new',
        status: 'available',
        category: 'Lighting',
        tags: 'lamp',
      });
    });

    it('should call createItem with the form data', async () => {
      const savedSpy = vi.fn();
      spectator.component.saved.subscribe(savedSpy);

      await spectator.component.save();

      expect(mockItemsService.createItem).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Lamp', description: 'A very bright and modern lamp.' })
      );
      expect(savedSpy).toHaveBeenCalled();
    });

    it('should not submit when the form is invalid', async () => {
      spectator.component.form.patchValue({ name: '', description: '' });

      await spectator.component.save();

      expect(mockItemsService.createItem).not.toHaveBeenCalled();
    });

    it('should mark all controls as touched on failed submit', async () => {
      spectator.component.form.patchValue({ name: '', description: '' });
      await spectator.component.save();
      expect(spectator.component.form.get('name')?.touched).toBe(true);
    });

    it('should parse comma-separated tags into an array', async () => {
      spectator.component.form.patchValue({ category: 'Furniture', tags: 'wood, ikea, tall' });
      await spectator.component.save();
      expect(mockItemsService.createItem).toHaveBeenCalledWith(
        expect.objectContaining({ tags: ['wood', 'ikea', 'tall'] })
      );
    });

    it('should upload the image before saving when a file is pending', async () => {
      const fakeFile = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
      spectator.component.pendingFile.set(fakeFile);

      await spectator.component.save();

      expect(mockImageUploadService.resizeAndUploadImages).toHaveBeenCalledWith(fakeFile);
      expect(mockItemsService.createItem).toHaveBeenCalledWith(
        expect.objectContaining({ imageUrl: 'https://storage.example.com/img.jpg' })
      );
    });

    it('should include price in cents when pricing is "priced"', async () => {
      spectator.component.form.patchValue({ pricing: 'priced' });
      spectator.component.onPricingChange('priced');
      spectator.component.form.get('price')!.setValue('5,99');

      await spectator.component.save();

      const call = vi.mocked(mockItemsService.createItem!).mock.calls[0][0] as Item;
      expect(call.price).toBe(599);
    });

    it('should omit price when pricing is "free"', async () => {
      await spectator.component.save();

      const call = vi.mocked(mockItemsService.createItem!).mock.calls[0][0] as Item;
      expect(call.price).toBeUndefined();
    });

    it('should set an error and not emit saved when createItem throws', async () => {
      (mockItemsService.createItem as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
      const savedSpy = vi.fn();
      spectator.component.saved.subscribe(savedSpy);

      await spectator.component.save();

      expect(spectator.component.error()).toBe('Network error');
      expect(savedSpy).not.toHaveBeenCalled();
    });
  });

  // ── save() — edit ────────────────────────────────────────────────────────────

  describe('save() — edit', () => {
    beforeEach(() => {
      spectator = createComponent({ props: { item: mockItem } });
      mockItemsService = spectator.inject(ItemsService) as Partial<ItemsService>;
      mockImageUploadService = spectator.inject(ImageUploadService) as Partial<ImageUploadService>;
    });

    it('should call updateItem with the item id and updated fields', async () => {
      const savedSpy = vi.fn();
      spectator.component.saved.subscribe(savedSpy);
      spectator.component.form.patchValue({ name: 'Updated Chair' });

      await spectator.component.save();

      expect(mockItemsService.updateItem).toHaveBeenCalledWith(
        'item-1',
        expect.objectContaining({ name: 'Updated Chair' })
      );
      expect(savedSpy).toHaveBeenCalled();
    });

    it('should send deleteField sentinel when switching priced item to free', async () => {
      spectator = createComponent({ props: { item: mockPricedItem } });
      mockItemsService = spectator.inject(ItemsService) as Partial<ItemsService>;
      spectator.component.onPricingChange('free');

      await spectator.component.save();

      expect(mockItemsService.updateItem).toHaveBeenCalledWith(
        'item-2',
        expect.objectContaining({ price: '__DELETE_FIELD__' })
      );
      expect(firestore.deleteField).toHaveBeenCalled();
    });
  });

  // ── image handling ───────────────────────────────────────────────────────────

  describe('onFileSelected()', () => {
    it('should set pendingFile from the event', () => {
      const file = new File(['img'], 'pic.jpg', { type: 'image/jpeg' });
      const input = { files: [file], value: '' } as unknown as HTMLInputElement;
      const event = { target: input } as unknown as Event;

      spectator.component.onFileSelected(event);

      expect(spectator.component.pendingFile()).toBe(file);
    });

    it('should do nothing when no file is selected', () => {
      const input = { files: [], value: '' } as unknown as HTMLInputElement;
      const event = { target: input } as unknown as Event;

      spectator.component.onFileSelected(event);

      expect(spectator.component.pendingFile()).toBeNull();
    });
  });

  describe('clearImage()', () => {
    it('should clear pendingFile, imagePreview and form imageUrl', () => {
      spectator.component.pendingFile.set(new File(['img'], 'a.jpg'));
      spectator.component.imagePreview.set('data:image/jpeg;base64,abc');
      spectator.component.form.patchValue({ imageUrl: 'https://old.url/img.jpg' });

      spectator.component.clearImage();

      expect(spectator.component.pendingFile()).toBeNull();
      expect(spectator.component.imagePreview()).toBeNull();
      expect(spectator.component.form.value.imageUrl).toBe('');
    });
  });

  // ── cancel ───────────────────────────────────────────────────────────────────

  describe('cancel()', () => {
    it('should emit the cancelled event', () => {
      const cancelledSpy = vi.fn();
      spectator.component.cancelled.subscribe(cancelledSpy);

      spectator.component.cancel();

      expect(cancelledSpy).toHaveBeenCalled();
    });
  });

  // ── isDirty ──────────────────────────────────────────────────────────────────

  describe('isDirty', () => {
    it('should be false when form is pristine and no pending file', () => {
      expect(spectator.component.isDirty).toBe(false);
    });

    it('should be true when the form has been modified', () => {
      spectator.component.form.patchValue({ name: 'Changed' });
      spectator.component.form.markAsDirty();
      expect(spectator.component.isDirty).toBe(true);
    });

    it('should be true when a pending file is set even if form is pristine', () => {
      spectator.component.pendingFile.set(new File(['img'], 'pic.jpg'));
      expect(spectator.component.isDirty).toBe(true);
    });
  });

  // ── beforeunload ─────────────────────────────────────────────────────────────

  describe('onBeforeUnload()', () => {
    it('should call preventDefault when form is dirty', () => {
      spectator.component.form.markAsDirty();
      const event = { preventDefault: vi.fn() } as unknown as BeforeUnloadEvent;

      spectator.component.onBeforeUnload(event);

      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should not call preventDefault when form is pristine', () => {
      const event = { preventDefault: vi.fn() } as unknown as BeforeUnloadEvent;

      spectator.component.onBeforeUnload(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentFactory, Spectator } from '@ngneat/spectator/vitest';
import { ItemFormComponent } from './item-form.component';
import { ItemsService } from '../../../shared/services/items.service';
import { ImageUploadService } from '../../../shared/services/image-upload.service';
import { Item } from '../../../shared/models/item.model';
import { Timestamp } from '@angular/fire/firestore';

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

describe('ItemFormComponent', () => {
  let spectator: Spectator<ItemFormComponent>;
  let mockItemsService: Partial<ItemsService>;
  let mockImageUploadService: Partial<ImageUploadService>;

  const createComponent = createComponentFactory({
    component: ItemFormComponent,
    providers: [
      { provide: ItemsService, useValue: { createItem: vi.fn(), updateItem: vi.fn() } },
      { provide: ImageUploadService, useValue: { resizeImage: vi.fn(), uploadItemImage: vi.fn() } },
    ],
  });

  beforeEach(() => {
    vi.clearAllMocks();

    spectator = createComponent();

    mockItemsService = spectator.inject(ItemsService) as Partial<ItemsService>;
    mockImageUploadService = spectator.inject(ImageUploadService) as Partial<ImageUploadService>;

    vi.mocked(mockItemsService.createItem!).mockResolvedValue('new-id');
    vi.mocked(mockItemsService.updateItem!).mockResolvedValue(undefined);
    vi.mocked(mockImageUploadService.resizeImage!).mockResolvedValue(new Blob(['img'], { type: 'image/jpeg' }));
    vi.mocked(mockImageUploadService.uploadItemImage!).mockResolvedValue('https://storage.example.com/img.jpg');
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

    it('should leave submit enabled when form is invalid so errors can be shown on click', () => {
      spectator.component.form.patchValue({ name: '', description: '', category: '', tags: '' });
      spectator.detectChanges();

      const submitBtn = spectator.query('button[type="submit"]') as HTMLButtonElement;
      expect(submitBtn.disabled).toBe(false);
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

      expect(mockImageUploadService.resizeImage).toHaveBeenCalledWith(fakeFile);
      expect(mockImageUploadService.uploadItemImage).toHaveBeenCalled();
      expect(mockItemsService.createItem).toHaveBeenCalledWith(
        expect.objectContaining({ imageUrl: 'https://storage.example.com/img.jpg' })
      );
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

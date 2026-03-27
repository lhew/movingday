import { Component, inject, input, output, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ItemsService } from '../../../shared/services/items.service';
import { ImageUploadService } from '../../../shared/services/image-upload.service';
import { Item, ItemCondition, ItemStatus } from '../../../shared/models/item.model';

@Component({
  selector: 'app-item-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './item-form.component.html',
})
export class ItemFormComponent implements OnInit {
  /** Pass an existing item to edit; omit (or pass null) to create */
  item = input<Item | null>(null);

  saved = output<void>();
  cancelled = output<void>();

  private fb = inject(FormBuilder);
  private itemsService = inject(ItemsService);
  private imageUploadService = inject(ImageUploadService);

  readonly conditions: ItemCondition[] = ['new', 'like-new', 'good', 'fair', 'worn'];
  readonly statuses: ItemStatus[] = ['available', 'claimed', 'gone'];
  private readonly categoryPattern = /^[a-zA-Z0-9][a-zA-Z0-9 &/\-]*$/;
  private readonly tagsPattern = /^\s*([a-zA-Z0-9-]{1,20})(\s*,\s*[a-zA-Z0-9-]{1,20})*\s*$/;

  form = this.fb.group({
    name:        ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
    condition:   ['good' as ItemCondition, Validators.required],
    status:      ['available' as ItemStatus, Validators.required],
    imageUrl:    [''],
    category:    ['', [Validators.maxLength(40), Validators.pattern(this.categoryPattern)]],
    tags:        ['', [Validators.maxLength(120), Validators.pattern(this.tagsPattern)]],
  });

  // Image upload state
  pendingFile = signal<File | null>(null);
  imagePreview = signal<string | null>(null);
  uploading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);

  ngOnInit() {
    const existing = this.item();
    if (existing) {
      this.form.patchValue({
        name:        existing.name,
        description: existing.description,
        condition:   existing.condition,
        status:      existing.status,
        imageUrl:    existing.imageUrl ?? '',
        category:    existing.category ?? '',
        tags:        existing.tags?.join(', ') ?? '',
      });
      if (existing.imageUrl) {
        this.imagePreview.set(existing.imageUrl);
      }
    }
  }

  get isEditing(): boolean {
    return !!this.item();
  }

  // Convenience getters for template error access
  get f() { return this.form.controls; }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Clear the input so the same file can be re-selected if needed
    input.value = '';

    this.pendingFile.set(file);

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => this.imagePreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  clearImage() {
    this.pendingFile.set(null);
    this.imagePreview.set(null);
    this.form.patchValue({ imageUrl: '' });
  }

  async save() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.saving.set(true);
    this.error.set(null);

    try {
      // Upload new image if one was selected
      if (this.pendingFile()) {
        this.uploading.set(true);
        const blob = await this.imageUploadService.resizeImage(this.pendingFile()!);
        const url = await this.imageUploadService.uploadItemImage(blob);
        this.form.patchValue({ imageUrl: url });
        this.uploading.set(false);
      }

      const raw = this.form.getRawValue();
      const data = {
        name:        raw.name!.trim(),
        description: raw.description!.trim(),
        condition:   raw.condition as ItemCondition,
        status:      raw.status as ItemStatus,
        imageUrl:    raw.imageUrl?.trim() || undefined,
        category:    raw.category?.trim() || undefined,
        tags:        raw.tags?.trim()
                       ? raw.tags.split(',').map(t => t.trim()).filter(Boolean)
                       : undefined,
      };

      const existing = this.item();
      if (existing) {
        await this.itemsService.updateItem(existing.id, data);
      } else {
        await this.itemsService.createItem(data as Omit<Item, 'id' | 'createdAt'>);
      }

      this.saved.emit();
    } catch (err: unknown) {
      this.uploading.set(false);
      this.error.set(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      this.saving.set(false);
    }
  }

  cancel() {
    this.cancelled.emit();
  }
}

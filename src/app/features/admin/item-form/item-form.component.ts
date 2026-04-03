import { Component, inject, input, output, signal, OnInit, HostListener } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { deleteField } from '@angular/fire/firestore';
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
    category:    ['', [Validators.required, Validators.maxLength(40), Validators.pattern(this.categoryPattern)]],
    tags:        ['', [Validators.required, Validators.maxLength(120), Validators.pattern(this.tagsPattern)]],
    pricing:     ['free' as 'free' | 'priced', Validators.required],
    price:       [''],
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
      const hasPricing = existing.price !== undefined;
      this.form.patchValue({
        name:        existing.name,
        description: existing.description,
        condition:   existing.condition,
        status:      existing.status,
        imageUrl:    existing.imageUrl ?? '',
        category:    existing.category ?? '',
        tags:        existing.tags?.join(', ') ?? '',
        pricing:     hasPricing ? 'priced' : 'free',
        price:       hasPricing ? this.formatCentsToDisplay(existing.price!) : '',
      });
      if (hasPricing) {
        this.onPricingChange('priced');
      }
      if (existing.imageUrl) {
        this.imagePreview.set(existing.imageUrl);
      }
    }
  }

  get isEditing(): boolean {
    return !!this.item();
  }

  get isDirty(): boolean {
    return this.form.dirty || this.pendingFile() !== null;
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.isDirty) {
      event.preventDefault();
    }
  }

  // Convenience getters for template error access
  get f() { return this.form.controls; }

  onPricingChange(value: 'free' | 'priced'): void {
    const priceControl = this.form.get('price')!;
    if (value === 'priced') {
      priceControl.setValidators([Validators.required, Validators.pattern(/^\d+,\d{2}$/)]);
    } else {
      priceControl.clearValidators();
      priceControl.setValue('');
    }
    priceControl.updateValueAndValidity();
  }

  onPriceInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').replace(/^0+/, '') || '0';
    const padded = digits.padStart(3, '0');
    const euros = parseInt(padded.slice(0, -2), 10);
    const cents = padded.slice(-2);
    const formatted = `${euros},${cents}`;
    input.value = formatted;
    this.form.get('price')!.setValue(formatted);
  }

  private formatCentsToDisplay(cents: number): string {
    const euros = Math.floor(cents / 100);
    const centsPart = (cents % 100).toString().padStart(2, '0');
    return `${euros},${centsPart}`;
  }

  private parseDisplayToCents(display: string): number {
    const [eurosStr, centsStr] = display.split(',');
    return parseInt(eurosStr, 10) * 100 + parseInt(centsStr || '0', 10);
  }

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
      const base = {
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
      const priceInCents = raw.pricing === 'priced' && raw.price
        ? this.parseDisplayToCents(raw.price)
        : undefined;

      const existing = this.item();
      if (existing) {
        // updateDoc rejects `undefined` — use deleteField() to remove the field
        const updatePayload: Record<string, unknown> = {
          ...base,
          price: priceInCents ?? deleteField(),
        };
        await this.itemsService.updateItem(existing.id, updatePayload as Partial<Item>);
      } else {
        await this.itemsService.createItem({
          ...base,
          ...(priceInCents !== undefined ? { price: priceInCents } : {}),
        } as Omit<Item, 'id' | 'createdAt'>);
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

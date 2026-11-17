import { Component, effect, input, signal } from '@angular/core';
import QRCode from 'qrcode';

@Component({
  selector: 'app-qr-code',
  template: `
    @if (dataUrl(); as src) {
      <img [src]="src" [alt]="alt()" class="h-full w-full rounded-xl bg-white p-2" />
    }
  `,
  host: { class: 'block' },
})
export class QrCode {
  readonly value = input.required<string>();
  readonly alt = input('Código QR');
  protected readonly dataUrl = signal<string | null>(null);

  constructor() {
    effect(() => {
      QRCode.toDataURL(this.value(), { margin: 1, width: 360, color: { dark: '#0d1b4f', light: '#ffffff' } })
        .then((url) => this.dataUrl.set(url))
        .catch(() => this.dataUrl.set(null));
    });
  }
}

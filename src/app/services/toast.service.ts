import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id:      number;
  message: string;
  type:    ToastType;
}

let nextId = 0;

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);

  private push(message: string, type: ToastType, duration = 3500): void {
    const id = ++nextId;
    this.toasts.update(list => [...list, { id, message, type }]);
    setTimeout(() => this.dismiss(id), duration);
  }

  success(message: string): void { this.push(message, 'success'); }
  error(message: string):   void { this.push(message, 'error', 5000); }
  info(message: string):    void { this.push(message, 'info'); }
  warning(message: string): void { this.push(message, 'warning'); }

  dismiss(id: number): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}

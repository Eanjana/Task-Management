/**
 * @description Toast notification service for displaying user feedback messages
 * @author Anjana E
 * @date 24-03-2026
 */
import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  message: string;  
  type: ToastType;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts = signal<Toast[]>([]);
  private nextId = 0;

  /** Public readonly toasts signal */
  readonly toasts = this._toasts.asReadonly();

  /**
   * @description Show a toast notification
   */
  show(message: string, type: ToastType = 'info', duration: number = 4000): void {
    const id = this.nextId++;
    
    let shouldAdd = true;
    this._toasts.update((arr) => {
      // Prevent exact duplicates
      if (arr.some(t => t.message === message)) {
        shouldAdd = false;
        return arr;
      }
      return [...arr, { id, message, type }].slice(-3); // Keep max 3 toasts
    });

    if (shouldAdd) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }

  /**
   * @description Dismiss a specific toast by ID
   */
  dismiss(id: number): void {
    this._toasts.update((arr) => arr.filter((t) => t.id !== id));
  }

  success(message: string): void { this.show(message, 'success'); }
  error(message: string): void { this.show(message, 'error', 6000); }
  info(message: string): void { this.show(message, 'info'); }
  warning(message: string): void { this.show(message, 'warning'); }
}

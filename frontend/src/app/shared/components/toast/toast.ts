import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastComponent {
  public toastService = inject(ToastService);
}

import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/auth/login/login';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/main-layout/main-layout').then(
        (m) => m.MainLayoutComponent
      ),
    canActivate: [authGuard],
    children: [
      {
        path: 'tasks',
        loadComponent: () =>
          import('./features/tasks/pages/task-list/task-list').then(
            (m) => m.TaskListComponent
          ),
      },
      {
        path: 'board',
        loadComponent: () =>
          import('./features/tasks/pages/task-board/task-board').then(
            (m) => m.TaskBoardComponent
          ),
      },
      {
        path: '',
        redirectTo: 'tasks',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];

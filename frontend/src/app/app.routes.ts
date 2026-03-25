import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login').then((m) => m.LoginComponent),
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

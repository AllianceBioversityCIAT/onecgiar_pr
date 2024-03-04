import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'example',
    loadComponent: () => import('../example/example.component').then(c => c.ExampleComponent)
  }
];

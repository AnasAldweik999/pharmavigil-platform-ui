import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'login',          renderMode: RenderMode.Prerender },
  { path: 'reset-password', renderMode: RenderMode.Prerender },
  { path: 'supervisor/**',  renderMode: RenderMode.Client },
  { path: 'staff/**',       renderMode: RenderMode.Client },
  { path: '**',             renderMode: RenderMode.Prerender },
];

# ═══════════════════════════════════════════════
# ANGULAR DEVELOPMENT GENERAL RULES
# Based on production project standards
# Angular 20+ | Standalone | Signals-first
# ═══════════════════════════════════════════════

## CORE PRINCIPLE
Use only what the task needs. Skip irrelevant rules.
If a rule conflicts with the task requirement, task wins.

# ───────────────────────────────────────────────
# 1. ANGULAR SETUP — MANDATORY
# ───────────────────────────────────────────────

- Angular 20+ ONLY — no deprecated syntax ever
- Standalone components ONLY — NO NgModules anywhere
- Bootstrap via bootstrapApplication() + app.config.ts
- provideRouter(routes) in app.config.ts
- provideHttpClient(withInterceptors([...])) in app.config.ts
- @for/@if/@switch ONLY — never *ngFor/*ngIf/*ngSwitch
- use track inside @for — never old trackBy function syntax
  CORRECT:   @for (item of items; track item.id)
  WRONG:     *ngFor="let item of items; trackBy: trackFn"
- inject() preferred over constructor DI everywhere
  CORRECT:   private service = inject(MyService);
  WRONG:     constructor(private service: MyService) {}
- Constructor only for signal effect() setup and initialization
- ChangeDetectionStrategy.OnPush on ALL components — no exceptions
- Lazy load ALL feature pages with loadComponent + dynamic import()
  CORRECT:   loadComponent: () => import('./page').then(m => m.Page)

# ───────────────────────────────────────────────
# 2. SIGNALS — STATE MANAGEMENT
# ───────────────────────────────────────────────

- Signals FIRST for all reactive state — then RxJS only if needed
- signal() for writable state
- computed() for derived/filtered state — never methods in templates
- effect() for side effects only (DOM updates, localStorage, Web Worker)
- input.required<T>() instead of @Input() for required inputs
- input<T>(defaultValue) instead of @Input() for optional inputs
- output<T>() instead of @Output() EventEmitter
- viewChild<ElementRef>('ref') instead of @ViewChild
- contentChild() instead of @ContentChild
- Use RxJS only for complex async streams — HTTP with operators,
  websockets, complex event chains
- Always use takeUntilDestroyed() for ALL Observable subscriptions
  — never manual ngOnDestroy + Subject for subscriptions
- Convert Observable to signal with toSignal() where it simplifies code
- Private signal: private _data = signal<T[]>([]);
- Public readonly: data = this._data.asReadonly();
- Signal updates must use new references:
  CORRECT:   list.update(arr => [...arr, newItem])
  WRONG:     list().push(newItem) — signal won't detect change

# ───────────────────────────────────────────────
# 3. TYPESCRIPT — STRICT TYPING
# ───────────────────────────────────────────────

- Strict TypeScript — NO implicit any ever
- Interface for EVERY data model/shape
- Union types for fixed value sets: 'open' | 'in-progress' | 'resolved'
- Optional fields with ?: for fields that may not exist
- Generic types on all signals, services, HTTP calls
- Type all function parameters and return types
- Use readonly on constants and private properties that never change
- Nullish coalescing ?? instead of || when 0 or '' are valid values
- Optional chaining ?. when accessing nested properties that may be null
- JSDoc comments on all classes and non-obvious methods:
  /**
   * @description What this does
   * @author Developer
   * @date DD-MM-YYYY
   */

# ───────────────────────────────────────────────
# 4. FOLDER STRUCTURE — MANDATORY
# ───────────────────────────────────────────────

src/
├── app/
│   ├── app.ts
│   ├── app.html
│   ├── app.scss
│   ├── app.config.ts          ← bootstrap config
│   ├── app.routes.ts          ← all routes
│   │
│   ├── core/                  ← singleton, app-wide
│   │   ├── guards/            ← auth.guard.ts (CanActivateFn)
│   │   ├── interceptors/      ← auth-interceptor.ts, error-interceptor.ts
│   │   ├── services/          ← auth.service.ts, theme.service.ts
│   │   └── workers/           ← analytics.worker.ts (heavy computation)
│   │
│   ├── features/              ← one folder per feature
│   │   ├── auth/
│   │   │   └── login/         ← login.ts, login.html, login.scss
│   │   ├── dashboard/
│   │   │   ├── components/    ← summary-cards, sla-metrics, issue-chart
│   │   │   ├── models/        ← dashboard.interface.ts
│   │   │   ├── pages/         ← dashboard.ts (lazy loaded)
│   │   │   └── services/      ← dashboard.service.ts
│   │   └── tasks/
│   │       ├── components/    ← task-table, task-kanban, task-form
│   │       ├── models/        ← task.interface.ts
│   │       ├── pages/         ← task-list, task-details (lazy loaded)
│   │       └── services/      ← task.service.ts
│   │
│   └── layout/                ← shell components
│       └── main-layout/       ← navbar, router-outlet wrapper
│
├── assets/
│   └── scss/
│       ├── atoms/             ← _button.scss, _theme-toggle.scss
│       ├── helpers/           ← _variables.scss, _mixins.scss,
│       │                          _typography.scss, _animations.scss
│       ├── organisms/         ← _dashboard.scss, _login.scss
│       └── themes/            ← _themes.scss (light/dark CSS variables)
│
└── styles.scss                ← imports all scss files

# ───────────────────────────────────────────────
# 5. SCSS — BEM + DESIGN SYSTEM
# ───────────────────────────────────────────────

- BEM naming ALWAYS: block__element--modifier
  CORRECT:   .issue-table__row--active
  WRONG:     .issueTableRowActive, .row.active
- SCSS variables file for ALL colors, spacing, typography, shadows
- CSS custom properties (--var-name) for ALL themeable values
  — SCSS variables for build-time fixed values
  — CSS custom properties for runtime theme switching
- Mixins for repeated patterns: flex-center, focus-ring, input-base, label-caps, respond-above, respond-below
- Light + Dark theme via [data-theme='light'] and [data-theme='dark'] on document root — controlled by ThemeService
- Mobile-first responsive — @include m.respond-above(md) for larger screens
- NEVER inline styles in TypeScript files
- NEVER hardcode color values in component SCSS — always use var(--clr-...)
- Separate SCSS file for every component
- Global styles imported in styles.scss in this order:
  1. helpers (variables, mixins, typography, animations)
  2. themes
  3. atoms
  4. organisms

# ───────────────────────────────────────────────
# 6. ROUTING
# ───────────────────────────────────────────────

- All routes in app.routes.ts
- Login route: direct component (not lazy — loads first)
- All feature routes: lazy loaded with loadComponent
- Protected routes: canActivate: [authGuard] on parent layout route
- Auth guard as CanActivateFn (functional — not class-based)
  — returns true, false, or router.createUrlTree(['/login'])
- Dynamic routes: /feature/:id for detail pages
- Wildcard route ** at the end → redirects to login
- pathMatch: 'full' on empty path redirects
- Main layout component wraps all authenticated routes as children

# ───────────────────────────────────────────────
# 7. HTTP AND API
# ───────────────────────────────────────────────

- All API URLs in environment files
- Auth interceptor: clones request, adds Bearer token from localStorage
- Error interceptor: catches HTTP errors globally, logs or shows toast
- ALL HTTP calls wrapped in catchError — never let errors crash the UI
- Parse date strings from API to Date objects immediately after fetch
- Centralized state: update locally after API success, do NOT re-fetch everything constantly.

# ───────────────────────────────────────────────
# 8. FORMS
# ───────────────────────────────────────────────

- Reactive Forms for ALL complex forms (FormBuilder, FormGroup, FormControl)
- Template-driven (ngModel) ONLY for simple single-field bindings
- Signal binding with ngModel:
  CORRECT:   [ngModel]="signal()" (ngModelChange)="signal.set($event)"
- markAllAsTouched() on submit to show all errors at once
- patchValue() for partial updates (edit mode)
- Show validation errors only on .touched && .invalid

# ───────────────────────────────────────────────
# 9. WEB WORKER
# ───────────────────────────────────────────────

- Use Web Worker for ANY computation over large arrays or heavy analytics.

# ───────────────────────────────────────────────
# 10. ACCESSIBILITY (A11Y) — MANDATORY
# ───────────────────────────────────────────────

- Semantic HTML ALWAYS (<nav>, <main>, <header>, <section>, <button>, <form>)
- aria-label on ALL icon-only buttons
- aria-hidden="true" on ALL decorative icons
- aria-pressed on toggle buttons
- aria-live="polite" on dynamic content areas
- role attributes where semantic tags are not enough
- tabindex="0" on any non-focusable element that needs keyboard access
- focus-ring mixin on ALL interactive elements (:focus-visible)

# ───────────────────────────────────────────────
# 11. PERFORMANCE
# ───────────────────────────────────────────────

- OnPush on every component — no exceptions
- Lazy loading on all feature routes
- track in every @for loop using unique id
- computed() for all derived/filtered lists
- Web Worker for heavy computation
- takeUntilDestroyed() for all subscriptions
- asReadonly() on public signals

# ───────────────────────────────────────────────
# 12. CODE QUALITY
# ───────────────────────────────────────────────

- Every file has ONE responsibility (Single Responsibility Principle)
- DRY — never repeat the same logic in two places
- Smart/Dumb component pattern (Smart = pages/containers; Dumb = components)
- No magic numbers
- No console.log in production code

# ───────────────────────────────────────────────
# 13. STRICTLY AVOID — NEVER DO THESE
# ───────────────────────────────────────────────

❌ NgModules
❌ *ngFor / *ngIf / *ngSwitch
❌ @Input() / @Output() EventEmitter — use input() / output()
❌ @ViewChild — use viewChild() signal
❌ Constructor DI — use inject()
❌ Inline styles in TypeScript
❌ Hardcoded colors in component SCSS
❌ Nested .subscribe() calls
❌ Missing catchError on HTTP calls
❌ Missing takeUntilDestroyed on subscriptions
❌ Methods called in templates for derived data — use computed()
❌ Non-semantic divs for interactive elements

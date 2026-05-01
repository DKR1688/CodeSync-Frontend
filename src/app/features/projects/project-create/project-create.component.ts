import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProjectService } from '../../../core/services/project.service';
import { ExecutionService } from '../../../core/services/execution.service';
import { SupportedLanguage } from '../../../core/models';

@Component({
  selector: 'app-project-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './project-create.component.html',
  styleUrl: './project-create.component.css'
})
export class ProjectCreateComponent implements OnInit {
  cdr = inject(ChangeDetectorRef);
  fb = inject(FormBuilder);
  router = inject(Router);
  projectService = inject(ProjectService);
  executionService = inject(ExecutionService);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    description: ['', Validators.maxLength(500)],
    language: ['', Validators.required],
    visibility: ['PUBLIC', Validators.required],
  });

  languages: SupportedLanguage[] = [];
  loading = false;
  error = '';

  LANG_ICONS: Record<string, string> = {
    python: '🐍', javascript: '🌐', typescript: '💙', java: '☕',
    go: '🐹', rust: '🦀', cpp: '⚙️', kotlin: '🎯', swift: '🍎',
    ruby: '💎', php: '🐘', r: '📊', c: '🔧'
  };

  ngOnInit(): void {
    this.executionService.getSupportedLanguages().subscribe({
      next: (langs) => {
        this.languages = langs.filter(l => l.enabled);
        this.syncView();
      },
      error: () => {
        // fallback
        this.languages = [
          { id: 'python', name: 'Python', version: '3.11', dockerImage: '', extension: '.py', monacoLanguage: 'python', enabled: true },
          { id: 'javascript', name: 'JavaScript', version: 'Node 20', dockerImage: '', extension: '.js', monacoLanguage: 'javascript', enabled: true },
          { id: 'typescript', name: 'TypeScript', version: '5.0', dockerImage: '', extension: '.ts', monacoLanguage: 'typescript', enabled: true },
          { id: 'java', name: 'Java', version: '21', dockerImage: '', extension: '.java', monacoLanguage: 'java', enabled: true },
          { id: 'go', name: 'Go', version: '1.21', dockerImage: '', extension: '.go', monacoLanguage: 'go', enabled: true },
          { id: 'rust', name: 'Rust', version: '1.73', dockerImage: '', extension: '.rs', monacoLanguage: 'rust', enabled: true },
          { id: 'cpp', name: 'C++', version: 'GCC 13', dockerImage: '', extension: '.cpp', monacoLanguage: 'cpp', enabled: true },
          { id: 'kotlin', name: 'Kotlin', version: '1.9', dockerImage: '', extension: '.kt', monacoLanguage: 'kotlin', enabled: true },
        ];
        this.syncView();
      }
    });
  }

  selectLanguage(languageId: string): void {
    this.form.patchValue({ language: languageId });
  }

  submit(): void {
    if (this.form.invalid || this.loading) return;
    this.loading = true;
    this.error = '';
    this.projectService.createProject(this.form.value as any).subscribe({
      next: (p) => this.router.navigate(['/projects', p.projectId]),
      error: (err) => {
        this.error = err?.error?.message || 'Failed to create project.';
        this.loading = false;
        this.syncView();
      }
    });
  }

  private syncView(): void {
    this.cdr.detectChanges();
  }
}

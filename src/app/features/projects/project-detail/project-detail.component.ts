import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProjectService } from '../../../core/services/project.service';
import { FileService } from '../../../core/services/file.service';
import { AuthService } from '../../../core/services/auth.service';
import { EntityId, Project, FileTreeNode, ProjectPermission, User } from '../../../core/models';
import { forkJoin, of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.css'
})
export class ProjectDetailComponent implements OnInit {
  cdr = inject(ChangeDetectorRef);
  route = inject(ActivatedRoute);
  router = inject(Router);
  projectService = inject(ProjectService);
  fileService = inject(FileService);
  authService = inject(AuthService);

  project?: Project;
  permissions?: ProjectPermission;
  fileTree: FileTreeNode[] = [];
  loading = true;
  activeTab = 'files';
  members: User[] = [];
  owner?: User;
  memberSearch = '';
  memberResults: User[] = [];
  memberActionLoading: string | null = null;
  searchingMembers = false;

  // New file modal
  showNewFileModal = false;
  newFileName = '';
  newFileType: 'file' | 'folder' = 'file';
  newFilePath = '';
  creatingFile = false;

  LANGS: Record<string, string> = {
    python: '#3572a5', javascript: '#f1e05a', typescript: '#3178c6',
    java: '#b07219', go: '#00add8', rust: '#dea584', cpp: '#f34b7d',
    kotlin: '#a97bff', swift: '#f05138', ruby: '#701516', php: '#4f5d95', r: '#198ce7'
  };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    forkJoin({
      project: this.projectService.getProject(id),
      permissions: this.projectService.getPermissions(id),
    }).subscribe({
      next: ({ project, permissions }) => {
        this.project = project;
        this.permissions = permissions;
        this.loadMembers();
        this.loadFileTree(id);
        this.syncView();
      },
      error: () => {
        this.loading = false;
        this.syncView();
      }
    });
  }

  loadFileTree(id: EntityId): void {
    this.fileService.getFileTree(id).subscribe({
      next: (tree) => {
        this.fileTree = tree;
        this.loading = false;
        this.syncView();
      },
      error: () => {
        this.loading = false;
        this.syncView();
      }
    });
  }

  loadMembers(): void {
    if (!this.project) {
      return;
    }

    this.authService.getUserProfile(this.project.ownerId).pipe(
      catchError(() => of(null))
    ).subscribe(owner => {
      this.owner = owner ?? undefined;
      this.syncView();
    });

    this.projectService.getMembers(String(this.project.projectId)).subscribe({
      next: (memberIds) => {
        if (memberIds.length === 0) {
          this.members = [];
          return;
        }

        forkJoin(
          memberIds.map(memberId => this.authService.getUserProfile(memberId).pipe(catchError(() => of(null))))
        ).subscribe(results => {
          this.members = results.filter((member): member is User => member !== null);
          this.syncView();
        });
      },
      error: () => {
        this.members = [];
        this.syncView();
      }
    });
  }

  getLangColor(lang?: string): string {
    return this.LANGS[lang?.toLowerCase() || ''] || '#9b9590';
  }

  getTimeAgo(d: string): string {
    const diff = (Date.now() - new Date(d).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  createFile(): void {
    if (!this.newFileName.trim() || !this.project) return;
    this.creatingFile = true;
    const path = this.newFilePath ? `${this.newFilePath}/${this.newFileName}` : this.newFileName;

    const obs = this.newFileType === 'folder'
      ? this.fileService.createFolder({ projectId: this.project.projectId, name: this.newFileName, path })
      : this.fileService.createFile({ projectId: this.project.projectId, name: this.newFileName, path, language: this.project.language });

    obs.subscribe({
      next: (file) => {
        this.showNewFileModal = false;
        this.newFileName = '';
        this.newFilePath = '';
        this.creatingFile = false;
        this.loadFileTree(this.project!.projectId);
        this.syncView();
        if (this.newFileType === 'file') {
          this.router.navigate(['/projects', this.project!.projectId, 'editor', file.fileId]);
        }
      },
      error: () => {
        this.creatingFile = false;
        this.syncView();
      }
    });
  }

  starProject(): void {
    if (!this.project) return;
    this.projectService.starProject(this.project.projectId).subscribe(p => {
      this.project = p;
      this.syncView();
    });
  }

  forkProject(): void {
    if (!this.project) return;
    this.projectService.forkProject(this.project.projectId).subscribe(p => {
      this.router.navigate(['/projects', p.projectId]);
    });
  }

  archiveProject(): void {
    if (!this.project || !confirm('Archive this project?')) return;
    this.projectService.archiveProject(this.project.projectId).subscribe(p => {
      this.project = p;
      this.syncView();
    });
  }

  deleteProject(): void {
    if (!this.project || !confirm(`Delete "${this.project.name}"? This cannot be undone.`)) return;
    this.projectService.deleteProject(this.project.projectId).subscribe(() => {
      this.router.navigate(['/projects']);
    });
  }

  searchMembers(): void {
    const query = this.memberSearch.trim();
    if (query.length < 2) {
      this.memberResults = [];
      return;
    }

    this.searchingMembers = true;
    this.authService.searchUsers(query).subscribe({
      next: users => {
        const existingIds = new Set([
          String(this.project?.ownerId ?? ''),
          ...this.members.map(member => String(member.userId)),
        ]);
        this.memberResults = users.filter(user => !existingIds.has(String(user.userId)));
        this.searchingMembers = false;
        this.syncView();
      },
      error: () => {
        this.memberResults = [];
        this.searchingMembers = false;
        this.syncView();
      }
    });
  }

  addMember(user: User): void {
    if (!this.project) {
      return;
    }

    this.memberActionLoading = `add-${user.userId}`;
    this.projectService.addMember(String(this.project.projectId), String(user.userId)).subscribe({
      next: () => {
        this.memberActionLoading = null;
        this.memberSearch = '';
        this.memberResults = [];
        this.members = [...this.members, user];
        this.syncView();
      },
      error: () => {
        this.memberActionLoading = null;
        this.syncView();
      }
    });
  }

  removeMember(user: User): void {
    if (!this.project || !confirm(`Remove ${user.username} from this project?`)) {
      return;
    }

    this.memberActionLoading = `remove-${user.userId}`;
    this.projectService.removeMember(String(this.project.projectId), String(user.userId)).subscribe({
      next: () => {
        this.memberActionLoading = null;
        this.members = this.members.filter(member => String(member.userId) !== String(user.userId));
        this.syncView();
      },
      error: () => {
        this.memberActionLoading = null;
        this.syncView();
      }
    });
  }

  getFileIcon(node: FileTreeNode): string {
    if (node.folder) return '📁';
    const ext = node.name.split('.').pop()?.toLowerCase();
    const icons: Record<string, string> = {
      py: '🐍', js: '🌐', ts: '💙', java: '☕', go: '🐹',
      rs: '🦀', cpp: '⚙️', c: '🔧', kt: '🎯', swift: '🍎',
      rb: '💎', php: '🐘', md: '📝', json: '📋', html: '🌐',
      css: '🎨', scss: '🎨', txt: '📄', sh: '⚡'
    };
    return icons[ext || ''] || '📄';
  }

  countFiles(nodes: FileTreeNode[]): number {
    return nodes.reduce((count, n) => count + (n.folder ? this.countFiles(n.children || []) : 1), 0);
  }

  getInitials(user?: User): string {
    if (!user) {
      return '?';
    }
    if (user.fullName) {
      return user.fullName.split(' ').map(name => name[0]).join('').toUpperCase().slice(0, 2);
    }
    return user.username.slice(0, 2).toUpperCase();
  }

  private syncView(): void {
    this.cdr.detectChanges();
  }
}

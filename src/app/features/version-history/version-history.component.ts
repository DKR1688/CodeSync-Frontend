import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VersionService } from '../../core/services/version.service';
import { Snapshot, DiffResult } from '../../core/models';

@Component({
  selector: 'app-version-history',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './version-history.component.html',
  styleUrl: './version-history.component.scss'
})
export class VersionHistoryComponent implements OnInit {
  cdr = inject(ChangeDetectorRef);
  route = inject(ActivatedRoute);
  versionService = inject(VersionService);

  projectId = '';
  fileId = '';
  snapshots: Snapshot[] = [];
  loading = true;
  selectedA?: Snapshot;
  selectedB?: Snapshot;
  diffResult?: DiffResult;
  loadingDiff = false;
  activeTab: 'history' | 'diff' = 'history';
  tagInput: Record<string, string> = {};
  newBranch = '';
  showBranchModal = false;

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id')!;
    this.fileId = this.route.snapshot.paramMap.get('fileId')!;
    this.versionService.getFileHistory(this.fileId).subscribe({
      next: (s) => {
        this.snapshots = s;
        this.loading = false;
        this.syncView();
      },
      error: () => {
        this.loading = false;
        this.syncView();
      }
    });
  }

  restore(s: Snapshot): void {
    if (!confirm(`Restore to "${s.message}"?\nThis creates a new snapshot with the old content.`)) return;
    this.versionService.restoreSnapshot(s.snapshotId).subscribe(newSnap => {
      this.snapshots.unshift(newSnap);
      this.syncView();
    });
  }

  selectForDiff(s: Snapshot): void {
    if (!this.selectedA) {
      this.selectedA = s;
    } else if (!this.selectedB && s.snapshotId !== this.selectedA.snapshotId) {
      this.selectedB = s;
    } else {
      this.selectedA = s;
      this.selectedB = undefined;
      this.diffResult = undefined;
    }
  }

  runDiff(): void {
    if (!this.selectedA || !this.selectedB) return;
    this.loadingDiff = true;
    this.activeTab = 'diff';
    this.versionService.diffSnapshots(this.selectedA.snapshotId, this.selectedB.snapshotId).subscribe({
      next: (d) => {
        this.diffResult = d;
        this.loadingDiff = false;
        this.syncView();
      },
      error: () => {
        this.loadingDiff = false;
        this.syncView();
      }
    });
  }

  clearDiff(): void {
    this.selectedA = undefined;
    this.selectedB = undefined;
    this.diffResult = undefined;
    this.activeTab = 'history';
  }

  tagSnapshot(s: Snapshot): void {
    const tag = this.tagInput[s.snapshotId];
    if (!tag?.trim()) return;
    this.versionService.tagSnapshot(s.snapshotId, tag).subscribe(updated => {
      const idx = this.snapshots.findIndex(x => x.snapshotId === s.snapshotId);
      if (idx > -1) this.snapshots[idx] = updated;
      this.tagInput[s.snapshotId] = '';
      this.syncView();
    });
  }

  createBranch(): void {
    const sourceSnapshotId = this.selectedA?.snapshotId || this.snapshots[0]?.snapshotId;
    if (!this.newBranch.trim() || !sourceSnapshotId) return;
    this.versionService.createBranch(String(sourceSnapshotId), this.newBranch).subscribe(() => {
      this.showBranchModal = false;
      this.newBranch = '';
      this.syncView();
    });
  }

  getTimeAgo(d: string): string {
    const diff = (Date.now() - new Date(d).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  getDiffClass(type: string): string {
    return type === 'ADDED' ? 'diff-added' : type === 'REMOVED' ? 'diff-removed' : 'diff-unchanged';
  }

  getDiffPrefix(type: string): string {
    return type === 'ADDED' ? '+' : type === 'REMOVED' ? '-' : ' ';
  }

  private syncView(): void {
    this.cdr.detectChanges();
  }
}

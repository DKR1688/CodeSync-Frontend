import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { VersionService } from '../../core/services/version.service';
import { Snapshot, DiffResult } from '../../core/models';

@Component({
  selector: 'app-version-history',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './version-history.component.html',
  styleUrl: './version-history.component.css'
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
  creatingBranch = false;
  branchError = '';
  readonly branchPattern = /^[A-Za-z0-9._/-]+$/;

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
    const branchName = this.newBranch.trim();
    const sourceSnapshotId = this.selectedA?.snapshotId || this.snapshots[0]?.snapshotId;
    if (!branchName || !sourceSnapshotId || this.creatingBranch) return;
    if (!this.branchPattern.test(branchName)) {
      this.branchError = 'Use letters, numbers, ".", "-", "_" or "/" only.';
      this.syncView();
      return;
    }

    this.creatingBranch = true;
    this.branchError = '';
    this.versionService.createBranch(sourceSnapshotId, branchName).subscribe({
      next: (branchHead) => {
        this.snapshots.unshift(branchHead);
        this.selectedA = branchHead;
        this.selectedB = undefined;
        this.diffResult = undefined;
        this.activeTab = 'history';
        this.showBranchModal = false;
        this.newBranch = '';
        this.creatingBranch = false;
        this.syncView();
      },
      error: (error: HttpErrorResponse) => {
        this.creatingBranch = false;
        this.branchError = this.getBranchErrorMessage(error);
        this.syncView();
      }
    });
  }

  openBranchModal(): void {
    this.branchError = '';
    this.newBranch = '';
    this.creatingBranch = false;
    this.showBranchModal = true;
  }

  closeBranchModal(): void {
    this.showBranchModal = false;
    this.newBranch = '';
    this.branchError = '';
    this.creatingBranch = false;
  }

  getBranchSourceLabel(): string {
    return this.selectedA?.message || this.snapshots[0]?.message || 'latest snapshot';
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

  private getBranchErrorMessage(error: HttpErrorResponse): string {
    const payload = error.error;
    if (typeof payload === 'string' && payload.trim()) {
      return payload;
    }
    if (payload?.message) {
      return payload.message;
    }
    if (payload?.error) {
      return payload.error;
    }
    return 'Unable to create the branch right now. Please try again.';
  }

  private syncView(): void {
    this.cdr.detectChanges();
  }
}

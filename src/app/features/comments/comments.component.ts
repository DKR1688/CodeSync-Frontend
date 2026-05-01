import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommentService } from '../../core/services/comment.service';
import { Comment, EntityId } from '../../core/models';

@Component({
  selector: 'app-comments',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './comments.component.html',
  styleUrl: './comments.component.css'
})
export class CommentsComponent implements OnInit {
  cdr = inject(ChangeDetectorRef);
  route = inject(ActivatedRoute);
  commentService = inject(CommentService);

  projectId = '';
  comments: Comment[] = [];
  filteredComments: Comment[] = [];
  loading = true;
  filter: 'all' | 'open' | 'resolved' = 'all';
  replyingTo?: EntityId;
  replyContent = '';
  editingId?: EntityId;
  editContent = '';

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id')!;
    this.commentService.getByProject(this.projectId).subscribe({
      next: (c) => {
        this.comments = this.buildThreads(c);
        this.applyFilter();
        this.loading = false;
        this.syncView();
      },
      error: () => {
        this.loading = false;
        this.syncView();
      }
    });
  }

  applyFilter(): void {
    this.filteredComments = this.comments.filter(c => {
      if (this.filter === 'open') return !c.resolved;
      if (this.filter === 'resolved') return c.resolved;
      return true;
    });
  }

  resolve(c: Comment): void {
    const obs = c.resolved ? this.commentService.unresolveComment(c.commentId) : this.commentService.resolveComment(c.commentId);
    obs.subscribe(updated => {
      const idx = this.comments.findIndex(x => x.commentId === c.commentId);
      if (idx > -1) { this.comments[idx] = updated; this.applyFilter(); }
      this.syncView();
    });
  }

  delete(commentId: string | number): void {
    if (!confirm('Delete this comment?')) return;
    this.commentService.deleteComment(commentId).subscribe(() => {
      this.comments = this.comments.filter(c => c.commentId !== commentId);
      this.applyFilter();
      this.syncView();
    });
  }

  startEdit(c: Comment): void {
    this.editingId = c.commentId;
    this.editContent = c.content;
  }

  saveEdit(c: Comment): void {
    this.commentService.updateComment(c.commentId, this.editContent).subscribe(updated => {
      const idx = this.comments.findIndex(x => x.commentId === c.commentId);
      if (idx > -1) { this.comments[idx] = updated; this.applyFilter(); }
      this.editingId = undefined;
      this.syncView();
    });
  }

  submitReply(parentId: string | number): void {
    if (!this.replyContent.trim()) return;
    const parent = this.comments.find(c => c.commentId === parentId);
    this.commentService.addComment({
      projectId: this.projectId,
      fileId: parent?.fileId || '',
      parentCommentId: parentId,
      lineNumber: parent?.lineNumber || 1,
      content: this.replyContent
    }).subscribe(reply => {
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(reply);
      }
      this.replyContent = '';
      this.replyingTo = undefined;
      this.syncView();
    });
  }

  buildThreads(comments: Comment[]): Comment[] {
    const commentMap = new Map(comments.map(comment => [String(comment.commentId), { ...comment, replies: [] as Comment[] }]));
    const roots: Comment[] = [];

    commentMap.forEach(comment => {
      if (comment.parentCommentId) {
        const parent = commentMap.get(String(comment.parentCommentId));
        if (parent) {
          parent.replies = [...(parent.replies || []), comment];
          return;
        }
      }

      roots.push(comment);
    });

    return roots;
  }

  getShortId(value: string | number): string {
    return String(value).slice(0, 8);
  }

  getInitial(value: string | number): string {
    return String(value).slice(0, 1).toUpperCase();
  }

  getTimeAgo(d: string): string {
    const diff = (Date.now() - new Date(d).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  private syncView(): void {
    this.cdr.detectChanges();
  }
}

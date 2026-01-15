/**
 * Hive Queen Panel Types
 * Message protocol between extension and webview
 */

export type PanelMode = 'planning' | 'execution' | 'dashboard' | 'review';

export interface ReviewRequest {
  feature: string;
  task: string;
  summary: string;
  attempt: number;
  requestedAt: string;
}

export interface TaskProgress {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'done' | 'blocked';
  subtasks?: SubtaskProgress[];
}

export interface SubtaskProgress {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'done';
}

export interface PendingAsk {
  id: string;
  question: string;
  timestamp: string;
  feature: string;
}

export interface PlanComment {
  id: string;
  lineNumber: number;
  text: string;
  resolved: boolean;
}

export interface FileSearchResult {
  name: string;
  path: string;
  uri: string;
  icon: string;
  isFolder?: boolean;
}

export interface FileAttachment {
  id: string;
  name: string;
  uri: string;
  isFolder?: boolean;
  folderPath?: string;
}

export interface FeatureCard {
  name: string;
  status: string;
  blocked: boolean;
  pendingReviews: number;
  stale: boolean;
  taskCount: number;
  completedTasks: number;
}

export interface TaskReviewInfo {
  name: string;
  status: string;
  pendingReview: boolean;
  summary?: string;
}

// Messages TO webview
export type HiveQueenToWebviewMessage =
  | { type: 'showPlan'; content: string; title: string; mode: PanelMode; comments?: PlanComment[] }
  | { type: 'updateProgress'; tasks: TaskProgress[] }
  | { type: 'showAsk'; ask: PendingAsk }
  | { type: 'updateComments'; comments: PlanComment[] }
  | { type: 'fileSearchResults'; files: FileSearchResult[] }
  | { type: 'updateAttachments'; attachments: FileAttachment[] }
  | { type: 'setMode'; mode: PanelMode }
  | { type: 'dashboard'; features: FeatureCard[] }
  | { type: 'featureDetail'; feature: string; plan: string; tasks: TaskReviewInfo[] }
  | { type: 'review'; feature: string; task: string; summary: string; attempt: number }
  | { type: 'showReview'; review: ReviewRequest };

// Messages FROM webview
export type HiveQueenFromWebviewMessage =
  | { type: 'approve'; comments: PlanComment[] }
  | { type: 'reject'; comments: PlanComment[]; reason?: string }
  | { type: 'answerAsk'; askId: string; answer: string }
  | { type: 'addComment'; lineNumber: number; text: string; revisedPart: string }
  | { type: 'editComment'; index: number; text: string }
  | { type: 'removeComment'; index: number }
  | { type: 'exportPlan' }
  | { type: 'searchFiles'; query: string }
  | { type: 'addFileReference'; file: FileSearchResult }
  | { type: 'removeAttachment'; attachmentId: string }
  | { type: 'ready' }
  | { type: 'openFeature'; name: string }
  | { type: 'backToDashboard' }
  | { type: 'viewDiff'; feature: string; task: string }
  | { type: 'openReview'; feature: string; task: string }
  | { type: 'reviewResult'; feature: string; task: string; result: string }
  | { type: 'block'; feature: string }
  | { type: 'unblock'; feature: string }
  | { type: 'approveTask'; feature: string; task: string }
  | { type: 'requestChanges'; feature: string; task: string; feedback: string };

export interface HiveQueenResult {
  approved: boolean;
  comments: PlanComment[];
  action: 'approved' | 'rejected' | 'closed';
  reason?: string;
}

export interface HiveQueenOptions {
  plan: string;
  title?: string;
  mode?: PanelMode;
  existingComments?: PlanComment[];
  featureName?: string;
  featurePath?: string;
  projectRoot?: string;
}

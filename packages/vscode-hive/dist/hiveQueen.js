(() => {
  // src/webview/hiveQueen.ts
  var vscode = acquireVsCodeApi();
  var currentMode = "planning";
  var comments = [];
  var currentLineNumber = 0;
  var editingCommentIndex = -1;
  var currentAskId = null;
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  function renderMarkdown(content) {
    return content.replace(/^### (.+)$/gm, "<h3>$1</h3>").replace(/^## (.+)$/gm, "<h2>$1</h2>").replace(/^# (.+)$/gm, "<h1>$1</h1>").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/`([^`]+)`/g, "<code>$1</code>").replace(/^- (.+)$/gm, "<li>$1</li>").replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>").replace(/^(\d+)\. (.+)$/gm, "<li>$2</li>").replace(/\n\n/g, "</p><p>").replace(/^(?!<[hulo])/gm, "<p>").replace(/(?<![>])$/gm, "</p>");
  }
  function renderPlanningView(content, title) {
    const planContent = document.getElementById("plan-content");
    const planTitle = document.getElementById("plan-title");
    if (planTitle) planTitle.textContent = title;
    if (!planContent) return;
    const lines = content.split("\n");
    let html = "";
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const hasComment = comments.some((c) => c.lineNumber === lineNum);
      const escapedLine = escapeHtml(line);
      const renderedLine = line.trim() ? renderMarkdown(escapedLine) : "&nbsp;";
      html += `
      <div class="line-wrapper${hasComment ? " has-comment" : ""}" data-line="${lineNum}">
        ${renderedLine}
        <button class="add-comment-btn" data-line="${lineNum}" title="Add comment">
          <span class="codicon codicon-comment"></span>
        </button>
      </div>
    `;
    });
    planContent.innerHTML = html;
    document.querySelectorAll(".add-comment-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const target = e.currentTarget;
        const lineNum = parseInt(target.dataset.line || "0", 10);
        openCommentDialog(lineNum);
      });
    });
  }
  function renderExecutionView(tasks) {
    const planContent = document.getElementById("plan-content");
    if (!planContent) return;
    if (tasks.length === 0) {
      planContent.innerHTML = '<p class="no-tasks">No tasks yet. Tasks will appear here once execution begins.</p>';
      return;
    }
    let html = '<div class="task-list">';
    tasks.forEach((task) => {
      const statusIcon = getStatusIcon(task.status);
      html += `
      <div class="task-item ${task.status}">
        <div class="task-header">
          <span class="task-status-icon">${statusIcon}</span>
          <span class="task-name">${escapeHtml(task.name)}</span>
          <span class="task-status">${task.status.replace("_", " ")}</span>
        </div>
        ${task.subtasks ? renderSubtasks(task.subtasks) : ""}
      </div>
    `;
    });
    html += "</div>";
    planContent.innerHTML = html;
  }
  function renderSubtasks(subtasks) {
    if (subtasks.length === 0) return "";
    let html = '<div class="subtask-list">';
    subtasks.forEach((st) => {
      html += `<div class="subtask-item ${st.status}">${getStatusIcon(st.status)} ${escapeHtml(st.name)}</div>`;
    });
    html += "</div>";
    return html;
  }
  function getStatusIcon(status) {
    const icons = {
      pending: '<span class="codicon codicon-circle-outline"></span>',
      in_progress: '<span class="codicon codicon-sync codicon-modifier-spin"></span>',
      done: '<span class="codicon codicon-pass-filled"></span>',
      blocked: '<span class="codicon codicon-error"></span>'
    };
    return icons[status] || icons.pending;
  }
  function renderComments() {
    const commentsList = document.getElementById("comments-list");
    if (!commentsList) return;
    if (comments.length === 0) {
      const strings = window.__HIVE_QUEEN_STRINGS__ || {};
      commentsList.innerHTML = `<p class="no-comments">${strings.noComments || "No comments yet."}</p>`;
      return;
    }
    let html = "";
    comments.forEach((comment, index) => {
      html += `
      <div class="comment-card" data-index="${index}">
        <div class="comment-citation">Line ${comment.lineNumber}</div>
        <div class="comment-text">${escapeHtml(comment.text)}</div>
        <div class="comment-actions">
          <button class="edit-comment" data-index="${index}">Edit</button>
          <button class="remove-comment" data-index="${index}">Remove</button>
        </div>
      </div>
    `;
    });
    commentsList.innerHTML = html;
    document.querySelectorAll(".edit-comment").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.currentTarget.dataset.index || "-1", 10);
        if (idx >= 0) openEditDialog(idx);
      });
    });
    document.querySelectorAll(".remove-comment").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.currentTarget.dataset.index || "-1", 10);
        if (idx >= 0) vscode.postMessage({ type: "removeComment", index: idx });
      });
    });
  }
  function openCommentDialog(lineNumber) {
    currentLineNumber = lineNumber;
    editingCommentIndex = -1;
    const dialog = document.getElementById("comment-dialog");
    const citationPreview = document.getElementById("citation-preview");
    const commentInput = document.getElementById("comment-input");
    const dialogTitle = document.getElementById("dialog-title");
    if (dialog) dialog.classList.remove("hidden");
    if (citationPreview) citationPreview.textContent = `Line ${lineNumber}`;
    if (commentInput) {
      commentInput.value = "";
      commentInput.focus();
    }
    if (dialogTitle) dialogTitle.textContent = "Add Comment";
  }
  function openEditDialog(index) {
    if (index < 0 || index >= comments.length) return;
    editingCommentIndex = index;
    currentLineNumber = comments[index].lineNumber;
    const dialog = document.getElementById("comment-dialog");
    const citationPreview = document.getElementById("citation-preview");
    const commentInput = document.getElementById("comment-input");
    const dialogTitle = document.getElementById("dialog-title");
    if (dialog) dialog.classList.remove("hidden");
    if (citationPreview) citationPreview.textContent = `Line ${currentLineNumber}`;
    if (commentInput) {
      commentInput.value = comments[index].text;
      commentInput.focus();
    }
    if (dialogTitle) dialogTitle.textContent = "Edit Comment";
  }
  function closeCommentDialog() {
    const dialog = document.getElementById("comment-dialog");
    if (dialog) dialog.classList.add("hidden");
    editingCommentIndex = -1;
  }
  function saveComment() {
    const commentInput = document.getElementById("comment-input");
    const text = commentInput?.value.trim();
    if (!text) return;
    if (editingCommentIndex >= 0) {
      vscode.postMessage({ type: "editComment", index: editingCommentIndex, text });
    } else {
      vscode.postMessage({ type: "addComment", lineNumber: currentLineNumber, text, revisedPart: "" });
    }
    closeCommentDialog();
  }
  function showAskDialog(ask) {
    currentAskId = ask.id;
    const dialog = document.getElementById("ask-dialog");
    const questionEl = document.getElementById("ask-question");
    const answerInput = document.getElementById("ask-answer");
    if (dialog) dialog.classList.remove("hidden");
    if (questionEl) questionEl.textContent = ask.question;
    if (answerInput) {
      answerInput.value = "";
      answerInput.focus();
    }
  }
  function submitAskAnswer() {
    if (!currentAskId) return;
    const answerInput = document.getElementById("ask-answer");
    const answer = answerInput?.value.trim();
    if (!answer) return;
    vscode.postMessage({ type: "answerAsk", askId: currentAskId, answer });
    const dialog = document.getElementById("ask-dialog");
    if (dialog) dialog.classList.add("hidden");
    currentAskId = null;
  }
  function updateModeUI() {
    const container = document.querySelector(".hive-queen-container");
    const primaryBtn = document.getElementById("primary-btn");
    const secondaryBtn = document.getElementById("secondary-btn");
    if (container) {
      container.classList.toggle("execution-mode", currentMode === "execution");
      container.classList.toggle("planning-mode", currentMode === "planning");
    }
    if (currentMode === "execution") {
      if (primaryBtn) primaryBtn.style.display = "none";
      if (secondaryBtn) secondaryBtn.style.display = "none";
    } else {
      if (primaryBtn) primaryBtn.style.display = "inline-flex";
      if (secondaryBtn) secondaryBtn.style.display = "inline-flex";
    }
  }
  window.addEventListener("message", (event) => {
    const message = event.data;
    switch (message.type) {
      case "showPlan":
        currentMode = message.mode || "planning";
        if (message.comments) comments = message.comments;
        updateModeUI();
        if (currentMode === "planning") {
          renderPlanningView(message.content, message.title);
        }
        renderComments();
        break;
      case "updateProgress":
        renderExecutionView(message.tasks);
        break;
      case "updateComments":
        comments = message.comments;
        renderComments();
        break;
      case "showAsk":
        showAskDialog(message.ask);
        break;
      case "setMode":
        currentMode = message.mode;
        updateModeUI();
        break;
    }
  });
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("primary-btn")?.addEventListener("click", () => {
      vscode.postMessage({ type: "approve", comments });
    });
    document.getElementById("secondary-btn")?.addEventListener("click", () => {
      vscode.postMessage({ type: "reject", comments });
    });
    document.getElementById("export-btn")?.addEventListener("click", () => {
      vscode.postMessage({ type: "exportPlan" });
    });
    document.getElementById("dialog-save")?.addEventListener("click", saveComment);
    document.getElementById("dialog-cancel")?.addEventListener("click", closeCommentDialog);
    document.getElementById("dialog-close")?.addEventListener("click", closeCommentDialog);
    document.getElementById("ask-submit")?.addEventListener("click", submitAskAnswer);
    vscode.postMessage({ type: "ready" });
  });
})();
//# sourceMappingURL=hiveQueen.js.map

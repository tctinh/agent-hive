#!/usr/bin/env node
import {
  Header,
  useFileWatcher
} from "./chunk-2UIYLJN2.js";

// src/plan-viewer/app.tsx
import { createSignal, createEffect, For as For2, Show as Show2 } from "solid-js";
import { useKeyboard, useTerminalDimensions } from "@opentui/solid";
import { PlanService } from "hive-core";

// src/plan-viewer/components/plan-line.tsx
import { For, Show } from "solid-js";
import { jsx, jsxs } from "@opentui/solid/jsx-runtime";
function PlanLine(props) {
  const lineColor = () => {
    const text = props.text;
    if (text.startsWith("# ")) return "cyan";
    if (text.startsWith("## ")) return "yellow";
    if (text.startsWith("### ")) return "green";
    if (text.startsWith("```")) return "magenta";
    if (text.startsWith("- ") || text.startsWith("* ")) return "white";
    return "white";
  };
  const hasComments = () => props.comments.length > 0;
  const prefix = () => hasComments() ? "* " : "  ";
  return /* @__PURE__ */ jsxs("box", { flexDirection: "column", children: [
    /* @__PURE__ */ jsxs(
      "text",
      {
        fg: props.isSelected ? "black" : lineColor(),
        bg: props.isSelected ? "cyan" : void 0,
        onClick: props.onLineClick,
        children: [
          prefix(),
          props.text || " "
        ]
      }
    ),
    /* @__PURE__ */ jsx(Show, { when: hasComments(), children: /* @__PURE__ */ jsx(For, { each: props.comments, children: (comment) => /* @__PURE__ */ jsxs(
      "text",
      {
        fg: props.selectedCommentId === comment.id ? "black" : "cyan",
        bg: props.selectedCommentId === comment.id ? "magenta" : void 0,
        onClick: () => props.onCommentClick(comment.id),
        children: [
          "    >> ",
          comment.author,
          ": ",
          comment.body
        ]
      }
    ) }) })
  ] });
}

// src/plan-viewer/components/comment-editor.tsx
import { jsx as jsx2, jsxs as jsxs2 } from "@opentui/solid/jsx-runtime";
function CommentEditor(props) {
  const modeLabel = () => props.mode === "add" ? "Add comment" : "Edit comment";
  const displayText = () => props.text();
  return /* @__PURE__ */ jsxs2("box", { borderStyle: "single", paddingLeft: 1, paddingRight: 1, children: [
    /* @__PURE__ */ jsxs2("text", { fg: "yellow", children: [
      modeLabel(),
      " on line ",
      props.lineNum,
      ": "
    ] }),
    /* @__PURE__ */ jsx2("text", { fg: "white", children: displayText() }),
    /* @__PURE__ */ jsx2("text", { fg: "cyan", blink: true, children: "_" }),
    /* @__PURE__ */ jsx2("text", { fg: "gray", children: " | [Enter] save [Esc] cancel" })
  ] });
}

// src/plan-viewer/app.tsx
import { jsx as jsx3, jsxs as jsxs3 } from "@opentui/solid/jsx-runtime";
function App(props) {
  const dimensions = useTerminalDimensions();
  const [planLines, setPlanLines] = createSignal([]);
  const [comments, setComments] = createSignal([]);
  const [selectedLine, setSelectedLine] = createSignal(1);
  const [selectedCommentId, setSelectedCommentId] = createSignal(null);
  const [scrollOffset, setScrollOffset] = createSignal(0);
  const [error, setError] = createSignal(null);
  const [editMode, setEditMode] = createSignal("none");
  const [editText, setEditText] = createSignal("");
  const refreshKey = useFileWatcher(
    () => props.feature,
    () => props.projectRoot
  );
  const visibleLines = () => Math.max(5, dimensions().height - 8);
  const commentsForLine = (line) => comments().filter((c) => c.line === line);
  createEffect(() => {
    const _ = refreshKey();
    try {
      const planService = new PlanService(props.projectRoot);
      const plan = planService.read(props.feature);
      if (plan?.content) {
        setPlanLines(plan.content.split("\n"));
      } else {
        setPlanLines(["# No plan.md found"]);
      }
      const planComments = planService.getComments(props.feature);
      setComments(planComments);
      setError(null);
    } catch (e) {
      setError(e.message || "Failed to load plan");
    }
  });
  useKeyboard((evt) => {
    if (editMode() !== "none") {
      if (evt.name === "escape") {
        setEditMode("none");
        setEditText("");
        setSelectedCommentId(null);
      } else if (evt.name === "return") {
        saveComment();
      } else if (evt.name === "backspace") {
        setEditText((t) => t.slice(0, -1));
      } else if (evt.raw && evt.raw.length === 1 && evt.raw.match(/[\x20-\x7E]/)) {
        setEditText((t) => t + evt.raw);
      }
      return;
    }
    if (evt.name === "up" || evt.name === "k") {
      navigateUp();
    } else if (evt.name === "down" || evt.name === "j") {
      navigateDown();
    } else if (evt.name === "g") {
      setSelectedLine(1);
      setScrollOffset(0);
      setSelectedCommentId(null);
    } else if (evt.name === "G") {
      const lastLine = planLines().length;
      setSelectedLine(lastLine);
      adjustScrollToLine(lastLine);
      setSelectedCommentId(null);
    } else if (evt.name === "c") {
      setEditMode("add");
      setEditText("");
    } else if (evt.name === "e") {
      if (selectedCommentId()) {
        const comment = comments().find((c) => c.id === selectedCommentId());
        if (comment) {
          setEditMode("edit");
          setEditText(comment.body);
        }
      }
    } else if (evt.name === "d") {
      if (selectedCommentId()) {
        deleteComment(selectedCommentId());
      }
    } else if (evt.name === "q") {
      process.exit(0);
    }
  });
  function navigateUp() {
    if (selectedCommentId()) {
      const lineComments = commentsForLine(selectedLine());
      const idx = lineComments.findIndex((c) => c.id === selectedCommentId());
      if (idx > 0) {
        setSelectedCommentId(lineComments[idx - 1].id);
      } else {
        setSelectedCommentId(null);
      }
    } else if (selectedLine() > 1) {
      setSelectedLine((l) => l - 1);
      adjustScrollToLine(selectedLine());
    }
  }
  function navigateDown() {
    const lineComments = commentsForLine(selectedLine());
    if (selectedCommentId()) {
      const idx = lineComments.findIndex((c) => c.id === selectedCommentId());
      if (idx < lineComments.length - 1) {
        setSelectedCommentId(lineComments[idx + 1].id);
      } else {
        setSelectedCommentId(null);
        if (selectedLine() < planLines().length) {
          setSelectedLine((l) => l + 1);
          adjustScrollToLine(selectedLine());
        }
      }
    } else if (lineComments.length > 0) {
      setSelectedCommentId(lineComments[0].id);
    } else if (selectedLine() < planLines().length) {
      setSelectedLine((l) => l + 1);
      adjustScrollToLine(selectedLine());
    }
  }
  function adjustScrollToLine(line) {
    const visible = visibleLines();
    if (line < scrollOffset() + 1) {
      setScrollOffset(Math.max(0, line - 1));
    } else if (line > scrollOffset() + visible) {
      setScrollOffset(line - visible);
    }
  }
  function saveComment() {
    const text = editText().trim();
    if (!text) {
      setEditMode("none");
      setEditText("");
      return;
    }
    try {
      const planService = new PlanService(props.projectRoot);
      if (editMode() === "add") {
        planService.addComment(props.feature, {
          line: selectedLine(),
          body: text,
          author: "user"
        });
      } else if (editMode() === "edit" && selectedCommentId()) {
        const allComments = planService.getComments(props.feature);
        const updated = allComments.map(
          (c) => c.id === selectedCommentId() ? { ...c, body: text, timestamp: (/* @__PURE__ */ new Date()).toISOString() } : c
        );
      }
      setEditMode("none");
      setEditText("");
    } catch (e) {
      setError(e.message);
    }
  }
  function deleteComment(commentId) {
    try {
      const planService = new PlanService(props.projectRoot);
      setSelectedCommentId(null);
    } catch (e) {
      setError(e.message);
    }
  }
  function handleLineClick(lineNum) {
    setSelectedLine(lineNum);
    setSelectedCommentId(null);
  }
  function handleCommentClick(commentId, lineNum) {
    setSelectedLine(lineNum);
    setSelectedCommentId(commentId);
  }
  const visibleContent = () => {
    const lines = planLines();
    const offset = scrollOffset();
    const count = visibleLines();
    const result = [];
    for (let i = offset; i < Math.min(offset + count, lines.length); i++) {
      result.push({
        lineNum: i + 1,
        text: lines[i],
        comments: commentsForLine(i + 1)
      });
    }
    return result;
  };
  return /* @__PURE__ */ jsxs3("box", { flexDirection: "column", flexGrow: 1, children: [
    /* @__PURE__ */ jsx3(Header, { icon: "\u{1F4CB}", title: "PLAN", feature: props.feature }),
    /* @__PURE__ */ jsx3(Show2, { when: error(), children: /* @__PURE__ */ jsx3("box", { children: /* @__PURE__ */ jsxs3("text", { fg: "red", children: [
      "Error: ",
      error()
    ] }) }) }),
    /* @__PURE__ */ jsx3("box", { flexDirection: "column", flexGrow: 1, children: /* @__PURE__ */ jsx3(For2, { each: visibleContent(), children: (item) => /* @__PURE__ */ jsx3(
      PlanLine,
      {
        text: item.text,
        comments: item.comments,
        isSelected: selectedLine() === item.lineNum && !selectedCommentId(),
        selectedCommentId: selectedCommentId(),
        onLineClick: () => handleLineClick(item.lineNum),
        onCommentClick: (id) => handleCommentClick(id, item.lineNum)
      }
    ) }) }),
    /* @__PURE__ */ jsx3(Show2, { when: editMode() !== "none", children: /* @__PURE__ */ jsx3(
      CommentEditor,
      {
        mode: editMode(),
        text: editText,
        lineNum: selectedLine()
      }
    ) }),
    /* @__PURE__ */ jsx3("box", { borderStyle: "single", paddingLeft: 1, children: /* @__PURE__ */ jsx3(Show2, { when: editMode() !== "none", fallback: /* @__PURE__ */ jsxs3("text", { fg: "gray", children: [
      "[c]omment  ",
      selectedCommentId() ? "[e]dit [d]elete  " : "",
      "[j/k] Navigate  [g/G] Top/Bottom  [q] Quit"
    ] }), children: /* @__PURE__ */ jsx3("text", { fg: "gray", children: "Type comment, [Enter] Save, [Esc] Cancel" }) }) })
  ] });
}
export {
  App
};

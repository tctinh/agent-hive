#!/usr/bin/env node
import {
  Header,
  useFileWatcher
} from "./chunk-2UIYLJN2.js";

// src/task-tracker/app.tsx
import { createSignal, createEffect, For, Show } from "solid-js";
import { useKeyboard, useTerminalDimensions } from "@opentui/solid";
import { TaskService } from "hive-core";

// src/task-tracker/components/task-row.tsx
import { jsxs } from "@opentui/solid/jsx-runtime";
var STATUS_ICONS = {
  done: "\u2713",
  in_progress: "\u23F3",
  pending: "\u25CB"
};
var STATUS_COLORS = {
  done: "green",
  in_progress: "yellow",
  pending: "gray"
};
function TaskRow(props) {
  const icon = () => STATUS_ICONS[props.task.status] || "?";
  const color = () => STATUS_COLORS[props.task.status] || "white";
  const displayName = () => {
    return props.task.name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };
  const badges = () => {
    const parts = [];
    if (props.task.hasSpec) parts.push("\u{1F4C4}");
    if (props.task.hasReport) parts.push("\u{1F4DD}");
    return parts.join(" ");
  };
  return /* @__PURE__ */ jsxs("box", { onMouseDown: props.onClick, children: [
    /* @__PURE__ */ jsxs(
      "text",
      {
        fg: props.isSelected ? "black" : color(),
        bg: props.isSelected ? "cyan" : void 0,
        children: [
          icon(),
          " ",
          displayName()
        ]
      }
    ),
    /* @__PURE__ */ jsxs("text", { fg: "gray", children: [
      " ",
      badges()
    ] })
  ] });
}

// src/task-tracker/components/detail-panel.tsx
import { jsx, jsxs as jsxs2 } from "@opentui/solid/jsx-runtime";
function DetailPanel(props) {
  const title = () => props.type === "spec" ? "\u{1F4C4} Spec" : "\u{1F4DD} Report";
  const lines = () => props.content.split("\n");
  return /* @__PURE__ */ jsxs2(
    "box",
    {
      flexDirection: "column",
      flexGrow: 1,
      borderStyle: "single",
      marginLeft: 1,
      children: [
        /* @__PURE__ */ jsxs2("box", { paddingLeft: 1, children: [
          /* @__PURE__ */ jsx("text", { fg: "cyan", children: title() }),
          /* @__PURE__ */ jsxs2("text", { fg: "gray", children: [
            ": ",
            props.taskName
          ] })
        ] }),
        /* @__PURE__ */ jsxs2("box", { flexDirection: "column", paddingLeft: 1, flexGrow: 1, children: [
          lines().slice(0, 20).map((line, idx) => /* @__PURE__ */ jsx("text", { fg: line.startsWith("#") ? "yellow" : "white", children: line || " " })),
          lines().length > 20 && /* @__PURE__ */ jsxs2("text", { fg: "gray", children: [
            "... (",
            lines().length - 20,
            " more lines)"
          ] })
        ] }),
        /* @__PURE__ */ jsx("box", { paddingLeft: 1, children: /* @__PURE__ */ jsxs2("text", { fg: "gray", children: [
          "[Tab] switch to ",
          props.type === "spec" ? "report" : "spec"
        ] }) })
      ]
    }
  );
}

// src/task-tracker/app.tsx
import { jsx as jsx2, jsxs as jsxs3 } from "@opentui/solid/jsx-runtime";
function App(props) {
  const dimensions = useTerminalDimensions();
  const [tasks, setTasks] = createSignal([]);
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [showDetail, setShowDetail] = createSignal(false);
  const [detailType, setDetailType] = createSignal("spec");
  const [detailContent, setDetailContent] = createSignal("");
  const [error, setError] = createSignal(null);
  const refreshKey = useFileWatcher(
    () => props.feature,
    () => props.projectRoot
  );
  const visibleTasks = () => Math.max(3, dimensions().height - 8);
  const [scrollOffset, setScrollOffset] = createSignal(0);
  createEffect(() => {
    const _ = refreshKey();
    try {
      const taskService = new TaskService(props.projectRoot);
      const taskList = taskService.list(props.feature);
      const enriched = taskList.map((t) => ({
        ...t,
        hasSpec: !!taskService.readSpec(props.feature, t.folder),
        hasReport: false
        // No readReport method, will check via paths later
      }));
      setTasks(enriched);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tasks");
    }
  });
  createEffect(() => {
    if (!showDetail()) return;
    const task = tasks()[selectedIndex()];
    if (!task) return;
    try {
      const taskService = new TaskService(props.projectRoot);
      const content = detailType() === "spec" ? taskService.readSpec(props.feature, task.folder) : null;
      setDetailContent(content || "(empty)");
    } catch {
      setDetailContent("(failed to load)");
    }
  });
  const progress = () => {
    const all = tasks();
    if (all.length === 0) return { done: 0, inProgress: 0, pending: 0, total: 0, percent: 0 };
    const done = all.filter((t) => t.status === "done").length;
    const inProgress = all.filter((t) => t.status === "in_progress").length;
    const pending = all.filter((t) => t.status === "pending").length;
    return { done, inProgress, pending, total: all.length, percent: Math.round(done / all.length * 100) };
  };
  const moveUp = () => {
    setSelectedIndex((i) => Math.max(0, i - 1));
    ensureVisible();
  };
  const moveDown = () => {
    setSelectedIndex((i) => Math.min(tasks().length - 1, i + 1));
    ensureVisible();
  };
  const ensureVisible = () => {
    const idx = selectedIndex();
    const offset = scrollOffset();
    const visible = visibleTasks();
    if (idx < offset) setScrollOffset(idx);
    if (idx >= offset + visible) setScrollOffset(idx - visible + 1);
  };
  const toggleDetail = () => setShowDetail((s) => !s);
  const switchDetailType = () => setDetailType((t) => t === "spec" ? "report" : "spec");
  useKeyboard((key, event) => {
    if (key === "q" || event.ctrl && key === "c") {
      process.exit(0);
    }
    if (key === "j" || key === "down") moveDown();
    if (key === "k" || key === "up") moveUp();
    if (key === "g") setSelectedIndex(0);
    if (key === "G") setSelectedIndex(tasks().length - 1);
    if (key === "enter" || key === "space") toggleDetail();
    if (key === "tab" && showDetail()) switchDetailType();
    if (key === "escape") setShowDetail(false);
  });
  const visibleTaskList = () => {
    const all = tasks();
    const offset = scrollOffset();
    const count = visibleTasks();
    return all.slice(offset, offset + count);
  };
  return /* @__PURE__ */ jsxs3("box", { flexDirection: "column", width: "100%", height: "100%", children: [
    /* @__PURE__ */ jsx2(
      Header,
      {
        icon: "\u{1F4CB}",
        title: "Task Tracker",
        feature: props.feature,
        status: `${progress().percent}% (${progress().done}/${progress().total})`
      }
    ),
    /* @__PURE__ */ jsx2(Show, { when: error(), children: /* @__PURE__ */ jsx2("box", { borderStyle: "single", paddingLeft: 1, children: /* @__PURE__ */ jsxs3("text", { fg: "red", children: [
      "Error: ",
      error()
    ] }) }) }),
    /* @__PURE__ */ jsxs3("box", { paddingLeft: 1, children: [
      /* @__PURE__ */ jsx2("text", { fg: "green", children: "\u2588".repeat(Math.floor(progress().done / Math.max(1, progress().total) * 30)) }),
      /* @__PURE__ */ jsx2("text", { fg: "yellow", children: "\u2588".repeat(Math.floor(progress().inProgress / Math.max(1, progress().total) * 30)) }),
      /* @__PURE__ */ jsx2("text", { fg: "gray", children: "\u2591".repeat(30 - Math.floor(progress().done / Math.max(1, progress().total) * 30) - Math.floor(progress().inProgress / Math.max(1, progress().total) * 30)) }),
      /* @__PURE__ */ jsxs3("text", { fg: "gray", children: [
        " ",
        progress().done,
        "\u2713 ",
        progress().inProgress,
        "\u23F3 ",
        progress().pending,
        "\u25CB"
      ] })
    ] }),
    /* @__PURE__ */ jsxs3("box", { flexDirection: "row", flexGrow: 1, children: [
      /* @__PURE__ */ jsx2("box", { flexDirection: "column", flexGrow: showDetail() ? 0 : 1, width: showDetail() ? "50%" : "100%", children: /* @__PURE__ */ jsx2(For, { each: visibleTaskList(), children: (task, index) => /* @__PURE__ */ jsx2(
        TaskRow,
        {
          task,
          isSelected: scrollOffset() + index() === selectedIndex(),
          onClick: () => setSelectedIndex(scrollOffset() + index())
        }
      ) }) }),
      /* @__PURE__ */ jsx2(Show, { when: showDetail(), children: /* @__PURE__ */ jsx2(
        DetailPanel,
        {
          type: detailType(),
          content: detailContent(),
          taskName: tasks()[selectedIndex()]?.name || ""
        }
      ) })
    ] }),
    /* @__PURE__ */ jsxs3("box", { borderStyle: "single", paddingLeft: 1, children: [
      /* @__PURE__ */ jsx2("text", { fg: "gray", children: "j/k" }),
      /* @__PURE__ */ jsx2("text", { children: " navigate " }),
      /* @__PURE__ */ jsx2("text", { fg: "gray", children: "Enter" }),
      /* @__PURE__ */ jsx2("text", { children: " toggle detail " }),
      /* @__PURE__ */ jsx2("text", { fg: "gray", children: "Tab" }),
      /* @__PURE__ */ jsx2("text", { children: " spec/report " }),
      /* @__PURE__ */ jsx2("text", { fg: "gray", children: "q" }),
      /* @__PURE__ */ jsx2("text", { children: " quit" })
    ] })
  ] });
}
export {
  App
};

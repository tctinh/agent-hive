#!/usr/bin/env node

// src/shared/hooks/use-file-watcher.ts
import { createSignal, createEffect, onCleanup } from "solid-js";
import { watch } from "chokidar";
function useFileWatcher(feature, projectRoot, debounce = 100) {
  const [refreshKey, setRefreshKey] = createSignal(0);
  createEffect(() => {
    const featureName = feature();
    const root = projectRoot();
    if (!featureName || !root) return;
    const featurePath = `${root}/.hive/features/${featureName}`;
    const watchPaths = [
      `${featurePath}/plan.md`,
      `${featurePath}/comments.json`,
      `${featurePath}/tasks/**/*`,
      `${featurePath}/context/**/*`
    ];
    let debounceTimer = null;
    const watcher = watch(watchPaths, {
      persistent: true,
      ignoreInitial: true,
      // Don't follow symlinks to avoid watching worktrees recursively
      followSymlinks: false
    });
    const handleChange = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        setRefreshKey((k) => k + 1);
      }, debounce);
    };
    watcher.on("add", handleChange);
    watcher.on("change", handleChange);
    watcher.on("unlink", handleChange);
    onCleanup(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      watcher.close();
    });
  });
  return refreshKey;
}

// src/shared/components/header.tsx
import { Show } from "solid-js";
import { jsx, jsxs } from "@opentui/solid/jsx-runtime";
function Header(props) {
  return /* @__PURE__ */ jsxs("box", { borderStyle: "single", paddingLeft: 1, children: [
    /* @__PURE__ */ jsxs("text", { children: [
      props.icon,
      " "
    ] }),
    /* @__PURE__ */ jsx("text", { fg: "cyan", children: props.title }),
    /* @__PURE__ */ jsxs("text", { children: [
      ": ",
      props.feature
    ] }),
    /* @__PURE__ */ jsx(Show, { when: props.status, children: /* @__PURE__ */ jsxs("text", { fg: "gray", children: [
      " [",
      props.status,
      "]"
    ] }) })
  ] });
}

export {
  useFileWatcher,
  Header
};

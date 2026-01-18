#!/usr/bin/env bun
#!/usr/bin/env node

// src/index.tsx
import { jsx } from "@opentui/solid/jsx-runtime";
var [, , subcommand, featureArg] = process.argv;
async function main() {
  if (subcommand === "plan" && featureArg) {
    const { render } = await import("@opentui/solid");
    const { App } = await import("./app-FEHG7H4A.js");
    await render(() => /* @__PURE__ */ jsx(App, { feature: featureArg, projectRoot: process.cwd() }));
    return;
  }
  if (subcommand === "tasks" && featureArg) {
    const { render } = await import("@opentui/solid");
    const { App } = await import("./app-N5RDTGKD.js");
    await render(() => /* @__PURE__ */ jsx(App, { feature: featureArg, projectRoot: process.cwd() }));
    return;
  }
  if (subcommand && !["plan", "tasks", "help", "--help", "-h"].includes(subcommand)) {
    console.log("");
    console.log("\x1B[33m\u26A0 DEPRECATED:\x1B[0m The multi-view TUI is deprecated.");
    console.log("");
    console.log("Use the new single-purpose TUIs instead:");
    console.log(`  \x1B[36mhive-tui plan ${subcommand}\x1B[0m   - View and comment on plan.md`);
    console.log(`  \x1B[36mhive-tui tasks ${subcommand}\x1B[0m  - Track task progress`);
    console.log("");
    process.exit(1);
  }
  console.log("");
  console.log("Usage: hive-tui <command> <feature>");
  console.log("");
  console.log("Commands:");
  console.log("  plan <feature>   Launch Plan Viewer TUI");
  console.log("  tasks <feature>  Launch Task Tracker TUI");
  console.log("");
  console.log("Examples:");
  console.log("  hive-tui plan my-feature");
  console.log("  hive-tui tasks my-feature");
  console.log("");
  process.exit(subcommand === "help" || subcommand === "--help" || subcommand === "-h" ? 0 : 1);
}
main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});

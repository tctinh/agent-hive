#!/usr/bin/env bun
/**
 * hive-tui - Terminal UI for Hive
 * 
 * Usage:
 *   hive-tui plan <feature>  - Launch Plan Viewer TUI
 *   hive-tui tasks <feature> - Launch Task Tracker TUI
 *   hive-tui <feature>       - (deprecated) Launch old multi-view TUI
 * 
 * The multi-view TUI is deprecated. Use plan or tasks subcommands instead.
 */

const [, , subcommand, featureArg] = process.argv;

async function main() {
  // Check for new subcommand style
  if (subcommand === 'plan' && featureArg) {
    const { render } = await import('@opentui/solid');
    const { App } = await import('./plan-viewer/app');
    await render(() => <App feature={featureArg} projectRoot={process.cwd()} />);
    return;
  }
  
  if (subcommand === 'tasks' && featureArg) {
    const { render } = await import('@opentui/solid');
    const { App } = await import('./task-tracker/app');
    await render(() => <App feature={featureArg} projectRoot={process.cwd()} />);
    return;
  }
  
  // Legacy: if first arg is a feature name (not a subcommand), show deprecation warning
  if (subcommand && !['plan', 'tasks', 'help', '--help', '-h'].includes(subcommand)) {
    console.log('');
    console.log('\x1b[33m⚠ DEPRECATED:\x1b[0m The multi-view TUI is deprecated.');
    console.log('');
    console.log('Use the new single-purpose TUIs instead:');
    console.log(`  \x1b[36mhive-tui plan ${subcommand}\x1b[0m   - View and comment on plan.md`);
    console.log(`  \x1b[36mhive-tui tasks ${subcommand}\x1b[0m  - Track task progress`);
    console.log('');
    process.exit(1);
  }
  
  // Show help
  console.log('');
  console.log('Usage: hive-tui <command> <feature>');
  console.log('');
  console.log('Commands:');
  console.log('  plan <feature>   Launch Plan Viewer TUI');
  console.log('  tasks <feature>  Launch Task Tracker TUI');
  console.log('');
  console.log('Examples:');
  console.log('  hive-tui plan my-feature');
  console.log('  hive-tui tasks my-feature');
  console.log('');
  process.exit(subcommand === 'help' || subcommand === '--help' || subcommand === '-h' ? 0 : 1);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

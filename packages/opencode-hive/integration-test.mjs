#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { WorktreeService } from './dist/services/worktreeService.js';

class IntegrationTester {
  constructor() {
    this.worktreeService = new WorktreeService({
      baseDir: process.cwd(),
      hiveDir: '.hive'
    });
    this.featureName = 'integration-test-feature';
    this.stepFolder = '01-test-step-1-batch-1';
    this.results = [];
  }

  async log(test, status, details) {
    const result = { test, status, details };
    this.results.push(result);
    const symbol = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '⚠';
    console.log(`${symbol} ${test}: ${details}`);
  }

  async setup() {
    console.log('\n=== Setup ===');
    
    const featureDir = path.join('.hive', 'features', this.featureName);
    await fs.mkdir(path.join(featureDir, 'execution'), { recursive: true });
    
    const stepDir = path.join(featureDir, 'execution', this.stepFolder);
    await fs.mkdir(stepDir, { recursive: true });
    await fs.writeFile(
      path.join(stepDir, 'spec.md'),
      '# Test Step\n\nCreate test-integration-1.txt with "Step 1 completed"',
      'utf8'
    );
    await fs.writeFile(
      path.join(stepDir, 'status.json'),
      JSON.stringify({ status: 'pending' }, null, 2),
      'utf8'
    );
    
    this.log('Setup', 'PASS', 'Feature and step created');
  }

  async testWorktreeCreation() {
    console.log('\n=== Test 1: Worktree Creation ===');
    
    try {
      const result = await this.worktreeService.create(this.featureName, this.stepFolder);
      
      const worktreePath = path.join('.hive', '.worktrees', this.featureName, this.stepFolder);
      const exists = await fs.access(worktreePath).then(() => true).catch(() => false);
      
      if (!exists) {
        throw new Error(`Worktree directory not found: ${worktreePath}`);
      }
      
      this.log('Worktree Creation', 'PASS', `Created at ${worktreePath} (branch: ${result.branch})`);
      return { worktreePath, baseCommit: result.commit };
    } catch (error) {
      this.log('Worktree Creation', 'FAIL', error.message);
      return null;
    }
  }

  async testExecuteInWorktree(worktreePath) {
    console.log('\n=== Test 2: Execute in Worktree ===');
    
    try {
      const testFile = path.join(worktreePath, 'test-integration-1.txt');
      await fs.writeFile(testFile, 'Step 1 completed', 'utf8');
      
      this.log('Execute in Worktree', 'PASS', 'Created test file in worktree');
      return testFile;
    } catch (error) {
      this.log('Execute in Worktree', 'FAIL', error.message);
      return null;
    }
  }

  async testGenerateDiff(baseCommit) {
    console.log('\n=== Test 3: Generate Diff ===');
    
    try {
      const worktreePath = path.join('.hive', '.worktrees', this.featureName, this.stepFolder);
      
      const { spawn } = await import('child_process');
      await new Promise((resolve, reject) => {
        const git = spawn('git', ['add', 'test-integration-1.txt'], { cwd: worktreePath });
        git.on('close', code => code === 0 ? resolve() : reject(new Error(`git add failed: ${code}`)));
      });
      
      const diffResult = await this.worktreeService.getDiff(this.featureName, this.stepFolder, baseCommit);
      
      console.log('Diff files changed:', diffResult.filesChanged);
      console.log('Insertions:', diffResult.insertions, 'Deletions:', diffResult.deletions);
      
      if (!diffResult.hasDiff && diffResult.filesChanged.length === 0) {
        throw new Error('No diff generated');
      }
      
      if (!diffResult.filesChanged.includes('test-integration-1.txt')) {
        throw new Error('Diff does not include test file');
      }
      
      this.log('Generate Diff', 'PASS', `Found ${diffResult.filesChanged.length} changed files`);
      return diffResult;
    } catch (error) {
      this.log('Generate Diff', 'FAIL', error.message);
      return null;
    }
  }

  async testApplyToMain(diffResult, baseCommit) {
    console.log('\n=== Test 4: Apply to Main ===');
    
    try {
      const stepDir = path.join('.hive', 'features', this.featureName, 'execution', this.stepFolder);
      await fs.writeFile(
        path.join(stepDir, 'output.diff'),
        diffResult.diffContent,
        'utf8'
      );
      
      const applyResult = await this.worktreeService.applyDiff(
        this.featureName,
        this.stepFolder,
        baseCommit
      );
      
      if (!applyResult.success) {
        throw new Error(`Apply failed: ${applyResult.error}`);
      }
      
      const testFile = path.join(process.cwd(), 'test-integration-1.txt');
      const exists = await fs.access(testFile).then(() => true).catch(() => false);
      
      if (!exists) {
        throw new Error('File not applied to main');
      }
      
      this.log('Apply to Main', 'PASS', `Applied ${applyResult.filesAffected.length} files`);
    } catch (error) {
      this.log('Apply to Main', 'FAIL', error.message);
    }
  }

  async testRevertSingleStep(baseCommit) {
    console.log('\n=== Test 5: Revert Single Step ===');
    
    try {
      const revertResult = await this.worktreeService.revertDiff(
        this.featureName,
        this.stepFolder,
        baseCommit
      );
      
      if (!revertResult.success) {
        throw new Error(`Revert failed: ${revertResult.error}`);
      }
      
      const testFile = path.join(process.cwd(), 'test-integration-1.txt');
      const exists = await fs.access(testFile).then(() => true).catch(() => false);
      
      if (exists) {
        throw new Error('File still exists after revert');
      }
      
      this.log('Revert Single Step', 'PASS', 'File successfully reverted');
    } catch (error) {
      this.log('Revert Single Step', 'FAIL', error.message);
    }
  }

  async testCleanup() {
    console.log('\n=== Cleanup ===');
    
    try {
      await this.worktreeService.remove(this.featureName, this.stepFolder);
      
      const featureDir = path.join('.hive', 'features', this.featureName);
      await fs.rm(featureDir, { recursive: true, force: true });
      
      this.log('Cleanup', 'PASS', 'Test artifacts removed');
    } catch (error) {
      this.log('Cleanup', 'WARN', error.message);
    }
  }

  async printSummary() {
    console.log('\n=== Test Summary ===');
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warned = this.results.filter(r => r.status === 'WARN').length;
    
    console.log(`Total: ${this.results.length} | Pass: ${passed} | Fail: ${failed} | Warn: ${warned}`);
    
    if (failed > 0) {
      console.log('\nFailed Tests:');
      this.results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`  - ${r.test}: ${r.details}`);
      });
    }
    
    return failed === 0;
  }

  async run() {
    console.log('🧪 Hive Integration Test Suite');
    console.log('Testing checkpoint/revert workflow\n');
    
    await this.setup();
    
    const worktreeInfo = await this.testWorktreeCreation();
    if (!worktreeInfo) {
      return false;
    }
    
    const testFile = await this.testExecuteInWorktree(worktreeInfo.worktreePath);
    if (!testFile) {
      await this.testCleanup();
      return false;
    }
    
    const diffResult = await this.testGenerateDiff(worktreeInfo.baseCommit);
    if (!diffResult) {
      await this.testCleanup();
      return false;
    }
    
    await this.testApplyToMain(diffResult);
    await this.testRevertSingleStep(worktreeInfo.baseCommit);
    await this.testCleanup();
    
    return await this.printSummary();
  }
}

const tester = new IntegrationTester();
tester.run()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test suite error:', error);
    process.exit(1);
  });

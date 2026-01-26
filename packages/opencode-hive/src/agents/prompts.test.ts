import { describe, expect, it } from 'bun:test';
import { QUEEN_BEE_PROMPT } from './hive';

describe('Hive (Hybrid) prompt', () => {
  describe('delegation planning alignment', () => {
    it('contains the Canonical Delegation Threshold block', () => {
      expect(QUEEN_BEE_PROMPT).toContain('### Canonical Delegation Threshold');
      expect(QUEEN_BEE_PROMPT).toContain('cannot name the file path upfront');
      expect(QUEEN_BEE_PROMPT).toContain('expect to inspect 2+ files');
      expect(QUEEN_BEE_PROMPT).toContain('open-ended');
      expect(QUEEN_BEE_PROMPT).toContain('Local `read/grep/glob`');
    });

    it('contains read-only exploration is allowed', () => {
      expect(QUEEN_BEE_PROMPT).toContain('Read-only exploration is allowed');
    });

    it('does NOT contain the old planning iron law "Don\'t execute - plan only"', () => {
      expect(QUEEN_BEE_PROMPT).not.toContain("- Don't execute - plan only");
    });

    it('recommends sync: true for single-scout research', () => {
      expect(QUEEN_BEE_PROMPT).toContain('sync: true');
    });

    it('includes internal codebase exploration in Research intent', () => {
      expect(QUEEN_BEE_PROMPT).toContain('Internal codebase exploration');
    });
  });
});

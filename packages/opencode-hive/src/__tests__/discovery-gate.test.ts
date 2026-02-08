import { describe, test, expect } from 'bun:test';

/**
 * Discovery Gate Tests
 * 
 * The discovery gate ensures plan writers include substantive discovery
 * documentation before proceeding to implementation planning.
 */

// Mock the hive_plan_write tool logic
function validateDiscoverySection(content: string): string | null {
  // GATE: Check for discovery section with substantive content
  const discoveryMatch = content.match(/^##\s+Discovery\s*$/im);
  if (!discoveryMatch) {
    return `BLOCKED: Discovery section required before planning.

Your plan must include a \`## Discovery\` section documenting:
- Questions you asked and answers received
- Research findings from codebase exploration
- Key decisions made

Add this section to your plan content and try again.`;
  }
  
  // Extract content between ## Discovery and next ## heading (or end)
  const afterDiscovery = content.slice(discoveryMatch.index! + discoveryMatch[0].length);
  const nextHeading = afterDiscovery.search(/^##\s+/m);
  const discoveryContent = nextHeading > -1
    ? afterDiscovery.slice(0, nextHeading).trim()
    : afterDiscovery.trim();
  
  if (discoveryContent.length < 100) {
    return `BLOCKED: Discovery section is too thin (${discoveryContent.length} chars, minimum 100).

A substantive Discovery section should include:
- Original request quoted
- Interview summary (key decisions)
- Research findings with file:line references

Expand your Discovery section and try again.`;
  }
  
  return null; // Pass
}

describe('Discovery Gate', () => {
  test('blocks plan with missing Discovery section', () => {
    const content = `# Feature Plan

## Overview
This is a plan without discovery.

## Implementation
- Step 1
- Step 2
`;
    
    const result = validateDiscoverySection(content);
    expect(result).toContain('BLOCKED: Discovery section required');
    expect(result).toContain('## Discovery');
  });

  test('blocks plan with Discovery header but empty body', () => {
    const content = `# Feature Plan

## Discovery

## Implementation
- Step 1
- Step 2
`;
    
    const result = validateDiscoverySection(content);
    expect(result).toContain('BLOCKED: Discovery section is too thin');
    expect(result).toContain('0 chars, minimum 100');
  });

  test('blocks plan with Discovery section < 100 chars', () => {
    const content = `# Feature Plan

## Discovery
Just a short note here.

## Implementation
- Step 1
`;
    
    const result = validateDiscoverySection(content);
    expect(result).toContain('BLOCKED: Discovery section is too thin');
    expect(result).toContain('minimum 100');
  });

  test('blocks plan with Discovery hidden in HTML comment', () => {
    const content = `# Feature Plan

<!-- ## Discovery -->
Hidden discovery that should not count.

## Implementation
- Step 1
`;
    
    const result = validateDiscoverySection(content);
    expect(result).toContain('BLOCKED: Discovery section required');
  });

  test('blocks plan with malformed Discovery header (singular)', () => {
    const content = `# Feature Plan

## Discover
This is not the right header.

## Implementation
- Step 1
`;
    
    const result = validateDiscoverySection(content);
    expect(result).toContain('BLOCKED: Discovery section required');
  });

  test('blocks plan with malformed Discovery header (extra text)', () => {
    const content = `# Feature Plan

## Discovery Phase
This header has extra text after Discovery.

## Implementation
- Step 1
`;
    
    const result = validateDiscoverySection(content);
    expect(result).toContain('BLOCKED: Discovery section required');
  });

  test('allows plan with well-formed Discovery section (≥100 chars)', () => {
    const content = `# Feature Plan

## Discovery

Asked user about authentication requirements. They confirmed OAuth2 with PKCE flow is preferred.
Researched existing auth patterns in src/lib/auth.ts:45-120. Found AuthProvider component that handles token refresh.

## Implementation
- Step 1
- Step 2
`;
    
    const result = validateDiscoverySection(content);
    expect(result).toBeNull(); // Should pass
  });

  test('allows Discovery at end of document', () => {
    const content = `# Feature Plan

## Overview
Brief overview here.

## Discovery

Asked user about authentication requirements. They confirmed OAuth2 with PKCE flow is preferred.
Researched existing auth patterns in src/lib/auth.ts:45-120. Found AuthProvider component that handles token refresh.
Key decision: Reuse AuthProvider instead of creating new component.
`;
    
    const result = validateDiscoverySection(content);
    expect(result).toBeNull(); // Should pass
  });

  test('correctly extracts Discovery content between headings', () => {
    const content = `# Feature Plan

## Discovery

This is exactly 100 characters of discovery content that should pass the validation gate test here ok.

## Implementation
This should not be counted as part of discovery.
`;
    
    const result = validateDiscoverySection(content);
    expect(result).toBeNull(); // Should pass
  });

  test('handles Discovery with varying whitespace in header', () => {
    const content = `# Feature Plan

##   Discovery   

Asked user about authentication requirements. They confirmed OAuth2 with PKCE flow is preferred.
Researched existing auth patterns in src/lib/auth.ts:45-120. Found AuthProvider component that handles token refresh.

## Implementation
- Step 1
`;
    
    const result = validateDiscoverySection(content);
    expect(result).toBeNull(); // Should pass
  });
});

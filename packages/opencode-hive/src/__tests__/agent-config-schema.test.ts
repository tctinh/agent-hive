import { describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const schemaPath = path.resolve(import.meta.dir, '..', '..', 'schema', 'agent_hive.schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8')) as Record<string, any>;

const expectReservedNameToFail = (name: string): void => {
  const reservedNames = schema.properties?.customAgents?.propertyNames?.not?.enum;
  expect(Array.isArray(reservedNames)).toBe(true);
  expect(reservedNames).toContain(name);
};

describe('agent_hive schema customAgents contract', () => {
  it('defines customAgents map and custom agent schema', () => {
    expect(schema.properties.customAgents).toBeDefined();
    expect(schema.properties.customAgents.additionalProperties).toEqual({
      $ref: '#/$defs/customAgentConfig',
    });
    expect(schema.$defs.customAgentConfig.required).toEqual(['baseAgent', 'description']);
    expect(schema.$defs.customAgentConfig.properties).not.toHaveProperty('skills');
  });

  it('restricts custom baseAgent to supported base agents', () => {
    expect(schema.$defs.customAgentConfig.properties.baseAgent.enum).toEqual([
      'forager-worker',
      'hygienic-reviewer',
    ]);
  });

  it('reserves built-in and plugin-managed agent names', () => {
    expectReservedNameToFail('hive-master');
    expectReservedNameToFail('architect-planner');
    expectReservedNameToFail('swarm-orchestrator');
    expectReservedNameToFail('scout-researcher');
    expectReservedNameToFail('forager-worker');
    expectReservedNameToFail('hive-helper');
    expectReservedNameToFail('hygienic-reviewer');
    expectReservedNameToFail('hive');
    expectReservedNameToFail('architect');
    expectReservedNameToFail('swarm');
    expectReservedNameToFail('scout');
    expectReservedNameToFail('forager');
    expectReservedNameToFail('hygienic');
    expectReservedNameToFail('receiver');
    expectReservedNameToFail('build');
    expectReservedNameToFail('plan');
    expectReservedNameToFail('code');
  });
});

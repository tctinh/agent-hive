#!/usr/bin/env bun

import * as fs from 'fs';
import { buildPluginManifest, getPluginManifestPath, stringifyPluginManifest } from '../src/utils/plugin-manifest.js';

const manifestPath = getPluginManifestPath();
const nextContent = stringifyPluginManifest(buildPluginManifest());

fs.writeFileSync(manifestPath, nextContent, 'utf-8');
console.log(`[generate-plugin-manifest] Generated: ${manifestPath}`);

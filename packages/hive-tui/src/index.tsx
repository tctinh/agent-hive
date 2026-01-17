#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { App } from './App.js';

const args = process.argv.slice(2);
const initialFeature = args[0] || undefined;

render(<App initialFeature={initialFeature} />);

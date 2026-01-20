import {
  getConfigPath,
  getHivePath,
  ensureDir,
  readJson,
  writeJson,
  fileExists,
} from '../utils/paths.js';
import { HiveConfig, DEFAULT_HIVE_CONFIG } from '../types.js';

/**
 * ConfigService manages the `.hive/config.json` file.
 * 
 * Config is project-scoped and shared between:
 * - OpenCode Hive plugin
 * - VSCode extension
 * - CLI tools
 */
export class ConfigService {
  constructor(private projectRoot: string) {}

  /**
   * Get the full config, merged with defaults.
   */
  get(): HiveConfig {
    const configPath = getConfigPath(this.projectRoot);
    const stored = readJson<Partial<HiveConfig>>(configPath);
    
    if (!stored) {
      return { ...DEFAULT_HIVE_CONFIG };
    }

    // Deep merge with defaults
    return {
      ...DEFAULT_HIVE_CONFIG,
      ...stored,
      agents: {
        ...DEFAULT_HIVE_CONFIG.agents,
        ...stored.agents,
      },
      omoSlim: {
        ...DEFAULT_HIVE_CONFIG.omoSlim,
        ...stored.omoSlim,
      },
    };
  }

  /**
   * Update config (partial merge).
   */
  set(updates: Partial<HiveConfig>): HiveConfig {
    const current = this.get();
    
    const merged: HiveConfig = {
      ...current,
      ...updates,
      agents: updates.agents ? {
        ...current.agents,
        ...updates.agents,
      } : current.agents,
      omoSlim: updates.omoSlim ? {
        ...current.omoSlim,
        ...updates.omoSlim,
      } : current.omoSlim,
    };

    // Ensure .hive directory exists
    ensureDir(getHivePath(this.projectRoot));
    writeJson(getConfigPath(this.projectRoot), merged);
    
    return merged;
  }

  /**
   * Check if config file exists.
   */
  exists(): boolean {
    return fileExists(getConfigPath(this.projectRoot));
  }

  /**
   * Initialize config with defaults if it doesn't exist.
   */
  init(): HiveConfig {
    if (!this.exists()) {
      return this.set(DEFAULT_HIVE_CONFIG);
    }
    return this.get();
  }

  /**
   * Check if OMO-Slim delegation is enabled.
   */
  isOmoSlimEnabled(): boolean {
    return this.get().omoSlim?.enabled ?? false;
  }

  /**
   * Enable or disable OMO-Slim delegation.
   */
  setOmoSlim(enabled: boolean): HiveConfig {
    return this.set({ omoSlim: { enabled } });
  }
}

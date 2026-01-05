export function validateFeatureName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: "Feature name cannot be empty" };
  }
  if (!/^[a-z0-9-]+$/.test(name)) {
    return { valid: false, error: "Feature name must be kebab-case (lowercase letters, numbers, hyphens only)" };
  }
  if (name.length > 100) {
    return { valid: false, error: "Feature name must be less than 100 characters" };
  }
  return { valid: true };
}

export function validateStepName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: "Step name cannot be empty" };
  }
  if (!/^[a-z0-9-]+$/.test(name)) {
    return { valid: false, error: "Step name must be kebab-case (lowercase letters, numbers, hyphens only)" };
  }
  if (name.length > 100) {
    return { valid: false, error: "Step name must be less than 100 characters" };
  }
  return { valid: true };
}

export function validateStepOrder(order: number): { valid: boolean; error?: string } {
  if (!Number.isInteger(order) || order < 1) {
    return { valid: false, error: "Step order must be a positive integer" };
  }
  if (order > 1000) {
    return { valid: false, error: "Step order must be less than 1000" };
  }
  return { valid: true };
}

export function validateDecisionTitle(title: string): { valid: boolean; error?: string } {
  if (!title || title.trim().length === 0) {
    return { valid: false, error: "Decision title cannot be empty" };
  }
  if (title.length > 200) {
    return { valid: false, error: "Decision title must be less than 200 characters" };
  }
  return { valid: true };
}

export function validateStepFolder(folder: string): { valid: boolean; error?: string } {
  if (!folder || folder.trim().length === 0) {
    return { valid: false, error: "Step folder cannot be empty" };
  }
  if (!/^\d{2}-[a-z0-9-]+$/.test(folder)) {
    return { valid: false, error: "Step folder must match pattern: NN-name (e.g., 01-setup)" };
  }
  return { valid: true };
}

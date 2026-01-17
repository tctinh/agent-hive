/**
 * Context helper - SolidJS context pattern from OpenCode
 */
import { createContext, useContext, type JSX, type ParentProps } from 'solid-js';

interface ContextConfig<T> {
  name: string;
  init: () => T;
}

export function createSimpleContext<T>(config: ContextConfig<T>) {
  const Context = createContext<T>();

  function provider(props: ParentProps): JSX.Element {
    const value = config.init();
    return <Context.Provider value={value}>{props.children}</Context.Provider>;
  }

  function use(): T {
    const ctx = useContext(Context);
    if (!ctx) {
      throw new Error(`${config.name} context not found. Wrap with provider.`);
    }
    return ctx;
  }

  return { provider, use };
}

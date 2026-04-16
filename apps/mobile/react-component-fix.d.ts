// Temporary type-compat layer for React 19 + React Native component base typing.
// Keeps the project compiling cleanly while upstream typings settle.

import type { ReactNode } from "react";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Component<P = {}, S = {}, SS = any> {
    context: unknown;

    setState<K extends keyof S>(
      state:
        | ((prevState: Readonly<S>, props: Readonly<P>) => Pick<S, K> | S | null)
        | (Pick<S, K> | S | null),
      callback?: () => void
    ): void;

    forceUpdate(callback?: () => void): void;

    render(): ReactNode;

    readonly props: Readonly<P>;
    state: Readonly<S>;
  }
}

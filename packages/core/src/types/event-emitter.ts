/* eslint-disable @typescript-eslint/no-explicit-any */
export type EventHandler<Args, Return = void> = Args extends any[]
  ? (...args: Args) => Return
  : (arg: Args) => Return;

export type Listeners<Events extends Record<string, any>> = {
  [K in keyof Events]?: Array<Events[K]>;
};

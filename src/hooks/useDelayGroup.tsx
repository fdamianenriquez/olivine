import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";

export interface DelayGroupTiming {
  /** Milliseconds the pointer rests before the first member opens. */
  openDelay: number;
  /** Milliseconds to wait before a member closes after the pointer leaves. */
  closeDelay: number;
  /** After a member closes, others open at once for this long. */
  skipDelay: number;
}

interface DelayGroupStore extends DelayGroupTiming {
  warm: boolean;
  warmTimer: number;
  current: { id: string; close: () => void } | null;
}

const createStore = (timing: DelayGroupTiming): DelayGroupStore => ({
  ...timing,
  warm: false,
  warmTimer: 0,
  current: null,
});

export const DEFAULT_DELAY_GROUP: DelayGroupTiming = {
  openDelay: 300,
  closeDelay: 0,
  skipDelay: 300,
};

interface StoreRef {
  current: DelayGroupStore;
}

/** Backs members rendered outside any provider, so the warm-up works without setup. */
const defaultStore: StoreRef = { current: createStore(DEFAULT_DELAY_GROUP) };

/** Test helper: forget the default group's warm state and open member. */
export function resetDefaultDelayGroup(): void {
  window.clearTimeout(defaultStore.current.warmTimer);
  defaultStore.current = createStore(DEFAULT_DELAY_GROUP);
}

const DelayGroupContext = createContext<StoreRef | null>(null);

export interface DelayGroupProviderProps extends Partial<DelayGroupTiming> {
  children?: ReactNode;
}

/**
 * Makes its hover-opened descendants one group: the first waits `openDelay`; once one has been
 * shown, the next opens at once for `skipDelay` after the last one closed; only one member is open
 * at a time.
 */
export function DelayGroupProvider({
  openDelay = DEFAULT_DELAY_GROUP.openDelay,
  closeDelay = DEFAULT_DELAY_GROUP.closeDelay,
  skipDelay = DEFAULT_DELAY_GROUP.skipDelay,
  children,
}: DelayGroupProviderProps) {
  const store = useRef(createStore({ openDelay, closeDelay, skipDelay }));
  useLayoutEffect(() => {
    store.current.openDelay = openDelay;
    store.current.closeDelay = closeDelay;
    store.current.skipDelay = skipDelay;
  }, [openDelay, closeDelay, skipDelay]);
  useEffect(
    () => () => {
      window.clearTimeout(store.current.warmTimer);
    },
    [],
  );
  return <DelayGroupContext.Provider value={store}>{children}</DelayGroupContext.Provider>;
}

export interface DelayGroupMember {
  /** The group's timing; a member's own props override it. */
  timing: DelayGroupTiming;
  /** True while a recently shown member makes the next one open at once. */
  isWarm: () => boolean;
  /** Call when the member opens; closes any other open member of the group at once. */
  opened: (close: () => void) => void;
  /** Call when the member closes; keeps the group warm for `skipDelay`. */
  closed: () => void;
}

/** Joins the nearest `DelayGroupProvider`, or the built-in default group. */
export function useDelayGroup(id: string): DelayGroupMember {
  const context = useContext(DelayGroupContext);
  const ref = context ?? defaultStore;
  return useMemo<DelayGroupMember>(() => {
    const read = () => ref.current;
    return {
      get timing() {
        const store = read();
        return {
          openDelay: store.openDelay,
          closeDelay: store.closeDelay,
          skipDelay: store.skipDelay,
        };
      },
      isWarm: () => read().warm,
      opened: (close) => {
        const store = read();
        window.clearTimeout(store.warmTimer);
        store.warm = true;
        const previous = store.current;
        store.current = { id, close };
        if (previous && previous.id !== id) previous.close();
      },
      closed: () => {
        const store = read();
        if (store.current?.id === id) store.current = null;
        window.clearTimeout(store.warmTimer);
        store.warmTimer = window.setTimeout(() => {
          store.warm = false;
        }, store.skipDelay);
      },
    };
  }, [ref, id]);
}

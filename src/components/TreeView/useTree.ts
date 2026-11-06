import {
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { useControllable } from "../../hooks/useControllable";
import { useIsomorphicLayoutEffect } from "../../hooks/useFloating";
import { addRange, toggleValue } from "../../hooks/useListbox";
import { useRovingFocus } from "../../hooks/useRovingFocus";
import { useTypeahead } from "../../hooks/useTypeahead";
import { useLabels } from "../../locale";
import { devWarn } from "../../utils/dev";
import { isImeKey } from "../../utils/ime";
import { reveal, visibleText } from "../../utils/listItems";
import {
  ancestorsOf,
  cascadeCheck,
  checkedStates,
  type CheckState,
  eligibleIds,
  flattenTree,
  hasLoadedChildren,
  indexTree,
  isBranch,
  isEligible,
  isSelectable,
  needsLoading,
  normalizeChecked,
  siblingsOf,
  type TreeEntry,
  type TreeNode,
} from "./tree";

const ITEM = '[role="treeitem"]';
/** Marks a tree root, so rows of a nested tree are left to that tree. */
const ROOT_ATTR = "data-ol-tree";
/** Marks the +/− sign and the check mark, so a click can tell them from the rest of the row. */
const SIGN_ATTR = "data-ol-tree-sign";
const CHECK_ATTR = "data-ol-tree-check";
/** Above this many visible rows a development warning suggests lazy loading. */
const MANY_ROWS = 1000;

export interface TreeOptions {
  /** The nodes, as data. */
  items: readonly TreeNode[];
  /** What a row selects: nothing, one node or several. */
  mode: "none" | "single" | "multiple";
  /** Draw a check mark per selectable node (multiple only; `aria-checked`). */
  checkboxes: boolean;
  /** With `checkboxes`: parents follow their children. */
  cascade: boolean;
  /** Selected ids (controlled), in the order chosen. */
  selected: readonly string[] | undefined;
  defaultSelected?: readonly string[] | undefined;
  onSelectedChange?: ((selected: string[]) => void) | undefined;
  /** Single selection: picking the selected node again clears it. */
  deselectable: boolean;
  /** Ids of the open nodes (controlled). */
  expanded: readonly string[] | undefined;
  defaultExpanded?: readonly string[] | undefined;
  onExpandedChange?: ((expanded: string[]) => void) | undefined;
  /** What a click on a parent's row does: open it, or leave that to the sign. */
  expandOn: "row" | "sign";
  /** Called on Enter, click or tap on a node, even when nothing changes. */
  onAction?: ((id: string, event: SyntheticEvent) => void) | undefined;
  /** Called once when a branch without children opens; a promise shows the loading row. */
  onLoadChildren?: ((node: TreeNode) => unknown) | undefined;
  /** The node that marks the current location. */
  current?: string | undefined;
  /** Disables every node; the tree is no longer a tab stop. */
  disabled: boolean;
  /** Typing jumps to a node by its first letters. */
  typeahead: boolean;
  /** The fold motion is on: user toggles are reported in `folding`. */
  fold: boolean;
  /** Receives the sentences for the live region. */
  announce?: ((message: string) => void) | undefined;
}

const sameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

const idOf = (el: Element) => el.getAttribute("data-value") ?? "";

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { then?: unknown }).then === "function";

/** The text a node is found by when typing: its `textValue`, else its label without the parts hidden from assistive technology. */
function textOf(row: HTMLElement): string {
  if (row.hasAttribute("data-text-value")) return visibleText(row);
  return visibleText(row.querySelector<HTMLElement>(".ol-tree__label") ?? row);
}

/**
 * Behaviour of a tree view (APG tree) as prop getters with no markup: open and closed nodes,
 * single or multiple selection or checkboxes with cascade, roving focus over the visible nodes,
 * typeahead, lazy loading and the live region sentences. Nodes are found in the DOM (collapsed
 * branches are not rendered), while cascade and Ctrl+A read the data model.
 */
export function useTree({
  items,
  mode,
  checkboxes,
  cascade,
  selected: selectedProp,
  defaultSelected,
  onSelectedChange,
  deselectable,
  expanded: expandedProp,
  defaultExpanded,
  onExpandedChange,
  expandOn,
  onAction,
  onLoadChildren,
  current,
  disabled,
  typeahead: typeaheadOn,
  fold,
  announce,
}: TreeOptions) {
  const t = useLabels();
  const baseId = useId();
  const treeRef = useRef<HTMLElement | null>(null);
  const multiple = mode === "multiple";

  const index = useMemo(() => indexTree(items), [items]);

  const [expandedList, setExpandedList] = useControllable<readonly string[]>(
    expandedProp,
    defaultExpanded ?? [],
    onExpandedChange as ((next: readonly string[]) => void) | undefined,
  );
  const expandedSet = useMemo(() => new Set(expandedList), [expandedList]);
  const [selected, setSelected] = useControllable<readonly string[]>(
    selectedProp,
    defaultSelected ?? [],
    onSelectedChange as ((next: readonly string[]) => void) | undefined,
  );
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const checks = useMemo(
    () => (checkboxes ? checkedStates(index, selected, cascade) : null),
    [checkboxes, index, selected, cascade],
  );

  const [loading, setLoading] = useState<ReadonlySet<string>>(() => new Set());
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  /** The node whose last open or close was a user toggle: the fold motion plays for it only. */
  const [folding, setFolding] = useState<string | null>(null);

  const anchor = useRef<string | null>(null);
  const shiftMove = useRef(false);
  const typeahead = useTypeahead();
  const requested = useRef(new Set<string>());
  const report = useRef<{ id: string; ok: boolean } | null>(null);
  const lastFocus = useRef<{ id: string; path: string[] } | null>(null);
  const pendingFocus = useRef<string | null>(null);
  // The latest state for callbacks that outlive a render (a promise settling).
  const latest = useRef({ expandedList, setExpandedList });
  useIsomorphicLayoutEffect(() => {
    latest.current = { expandedList, setExpandedList };
  });

  const encode = (id: string) => encodeURIComponent(id).replace(/%/g, "_");
  const rowId = (id: string) => `${baseId}-n-${encode(id)}`;
  const groupId = (id: string) => `${baseId}-g-${encode(id)}`;

  /** The rows a reader can reach: in the DOM and not inside a group that is closing. */
  const rows = useCallback((): HTMLElement[] => {
    const root = treeRef.current;
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>(ITEM)).filter(
      (el) => el.closest(`[${ROOT_ATTR}]`) === root && el.closest("[inert]") === null,
    );
  }, []);
  const enabledRows = () =>
    disabled ? [] : rows().filter((el) => !el.hasAttribute("data-disabled"));
  const rowFor = (id: string) => rows().find((el) => idOf(el) === id);

  const toggleOpen = (id: string, user = true) => {
    const open = expandedSet.has(id);
    if (fold) setFolding(user ? id : null);
    setExpandedList(open ? expandedList.filter((x) => x !== id) : [...expandedList, id]);
  };

  const openSiblings = (id: string) => {
    const closed = siblingsOf(index, id)
      .filter((n) => isBranch(n) && !expandedSet.has(n.id))
      .map((n) => n.id);
    if (closed.length === 0) return;
    if (fold) setFolding(null);
    setExpandedList([...expandedList, ...closed]);
  };

  const bulk = (count: number) => {
    announce?.(t.optionsSelected(count));
  };

  const commit = (next: string[], isBulk = false) => {
    if (!sameList(next, selected)) setSelected(next);
    if (isBulk) bulk(next.length);
  };

  /** Checks or unchecks a node, with its children when cascading. */
  const toggleChecked = (id: string) => {
    const on = checks?.get(id) !== "checked";
    return cascadeCheck(index, selected, id, on, cascade);
  };

  const selectRange = (from: string | null, to: string) => {
    const all = rows();
    const order = all.map(idOf);
    const enabled = new Set(
      order.filter((id) => {
        const entry = index.entries.get(id);
        return entry !== undefined && isEligible(entry.node);
      }),
    );
    if (checkboxes) {
      const range = addRange([], order, enabled, from, to);
      commit(
        range.reduce((value, id) => cascadeCheck(index, value, id, true, cascade), [...selected]),
        true,
      );
    } else {
      commit(addRange(selected, order, enabled, from, to), true);
    }
  };

  /** Picks a node: replace (single), toggle (multiple), or a visible range from the last pick. */
  const choose = (id: string, range = false) => {
    const entry = index.entries.get(id);
    if (disabled || mode === "none" || !entry || !isEligible(entry.node)) return;
    if (mode === "single") {
      if (selected[0] === id) {
        if (deselectable) commit([]);
      } else {
        commit([id]);
      }
    } else if (range) {
      selectRange(anchor.current, id);
    } else {
      commit(checkboxes ? toggleChecked(id) : toggleValue(selected, id));
    }
    anchor.current = id;
  };

  const selectAll = () => {
    const ids = eligibleIds(index);
    const state = (id: string) =>
      checkboxes ? checks?.get(id) === "checked" : selectedSet.has(id);
    if (ids.length === 0) return;
    if (ids.every(state)) {
      const drop = new Set(ids);
      commit(
        selected.filter((v) => !drop.has(v)),
        true,
      );
    } else if (checkboxes && cascade) {
      commit(normalizeChecked(index, [...selected, ...ids], true), true);
    } else {
      commit([...selected, ...ids.filter((id) => !selectedSet.has(id))], true);
    }
  };

  // Roving tabindex over the visible nodes; Up and Down are kept from the page at the ends.
  const roving = useRovingFocus(treeRef, {
    itemSelector: ITEM,
    orientation: "vertical",
    selectedSelector: '[aria-selected="true"], [aria-current]',
    restore: checkboxes ? "last" : "selected",
    preventScroll: true,
    consumeEnds: true,
    disabled,
    onActiveChange: (item, key) => {
      const root = treeRef.current;
      if (root) reveal(root, item);
      if (multiple && shiftMove.current && key.startsWith("Arrow")) choose(idOf(item));
    },
  });

  const focusRow = (el: HTMLElement | undefined) => {
    if (!el || !roving.focusItem(el)) return false;
    const root = treeRef.current;
    if (root) reveal(root, el);
    return true;
  };

  // Lazy loading: the first time an open branch has no children, ask for them.
  const fail = (id: string) => {
    requested.current.delete(id);
    setFailed((prev) => new Set(prev).add(id));
    const { expandedList: list, setExpandedList: set } = latest.current;
    // A failed load closes the node at once; the cue under it is what the reader needs.
    setFolding(null);
    if (list.includes(id)) set(list.filter((x) => x !== id));
  };
  const load = (node: TreeNode) => {
    if (!onLoadChildren) return;
    let result: unknown;
    try {
      result = onLoadChildren(node);
    } catch {
      report.current = { id: node.id, ok: false };
      fail(node.id);
      return;
    }
    setFailed((prev) => {
      if (!prev.has(node.id)) return prev;
      const next = new Set(prev);
      next.delete(node.id);
      return next;
    });
    if (!isThenable(result)) return;
    setLoading((prev) => new Set(prev).add(node.id));
    const settle = (ok: boolean) => {
      report.current = { id: node.id, ok };
      if (!ok) fail(node.id);
      setLoading((prev) => {
        const next = new Set(prev);
        next.delete(node.id);
        return next;
      });
    };
    result.then(
      () => {
        settle(true);
      },
      () => {
        settle(false);
      },
    );
  };
  useEffect(() => {
    if (!onLoadChildren) return;
    for (const id of expandedSet) {
      const node = index.entries.get(id)?.node;
      if (!node || !needsLoading(node) || requested.current.has(id)) continue;
      requested.current.add(id);
      load(node);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `load` only reads the latest callback
  }, [expandedSet, index]);

  // The sentence for a finished load, read after the render that carries the new children.
  useEffect(() => {
    const done = report.current;
    if (!done || loading.has(done.id)) return;
    report.current = null;
    const node = index.entries.get(done.id)?.node;
    const label = (() => {
      const el = rowFor(done.id)?.querySelector<HTMLElement>(".ol-tree__label");
      const text = el ? visibleText(el).trim() : "";
      if (text !== "") return text;
      if (node?.textValue) return node.textValue;
      return typeof node?.label === "string" ? node.label : done.id;
    })();
    announce?.(
      done.ok ? t.treeLoaded(label, node?.children?.length ?? 0) : t.treeLoadFailed(label),
    );
  });

  // Many open rows: the DOM is the tree, so every row costs.
  const visibleCount = useMemo(() => flattenTree(items, expandedSet).length, [items, expandedSet]);
  const many = visibleCount > MANY_ROWS;
  useEffect(() => {
    if (many) {
      devWarn(
        "TreeView",
        `${String(visibleCount)} rows are open at once and there is no virtualisation; collapse branches by default and load children with \`hasChildren\` and \`onLoadChildren\`.`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- warns once on crossing the limit
  }, [many]);
  useEffect(() => {
    if (index.duplicates.length > 0) {
      devWarn("TreeView", `ids must be unique; repeated: ${index.duplicates.join(", ")}.`);
    }
  }, [index]);

  // Focus follows its node when the node goes: to the nearest visible ancestor.
  useIsomorphicLayoutEffect(() => {
    // The roving hook is off for a disabled tree and leaves the last tab stop behind.
    if (disabled) {
      for (const el of treeRef.current?.querySelectorAll(ITEM) ?? [])
        el.removeAttribute("tabindex");
    }
    const wanted = pendingFocus.current;
    if (wanted !== null) {
      const row = rowFor(wanted);
      if (row) {
        pendingFocus.current = null;
        const root = treeRef.current;
        if (root) reveal(root, row, "center");
        roving.focusItem(row);
        return;
      }
    }
    const last = lastFocus.current;
    if (!last || disabled) return;
    const list = rows();
    if (list.some((el) => idOf(el) === last.id)) return;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    const target = last.path
      .map((id) => list.find((el) => idOf(el) === id))
      .find((el) => el !== undefined && !el.hasAttribute("data-disabled"));
    if (target) roving.focusItem(target);
    else lastFocus.current = null;
  });

  const onTreeKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (disabled || event.defaultPrevented || isImeKey(event)) return;
    const root = treeRef.current;
    const row = (event.target as Element).closest<HTMLElement>(ITEM);
    if (!root || row?.closest(`[${ROOT_ATTR}]`) !== root) return;
    const id = idOf(row);
    const entry = index.entries.get(id);
    if (!entry) return;
    const mod = event.ctrlKey || event.metaKey;

    if (multiple && mod && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "a") {
      event.preventDefault();
      selectAll();
      return;
    }
    if (
      multiple &&
      mod &&
      event.shiftKey &&
      !event.altKey &&
      (event.key === "Home" || event.key === "End")
    ) {
      event.preventDefault();
      const list = enabledRows();
      const edge = event.key === "Home" ? list[0] : list[list.length - 1];
      if (!edge) return;
      selectRange(id, idOf(edge));
      anchor.current = id;
      focusRow(edge);
      return;
    }
    if (mod || event.altKey) return;

    if (event.key === "*") {
      event.preventDefault();
      openSiblings(id);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      onAction?.(id, event);
      if (isBranch(entry.node)) toggleOpen(id);
      else choose(id);
      return;
    }

    if (!event.shiftKey && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
      const rtl = getComputedStyle(row).direction === "rtl";
      const forward = event.key === (rtl ? "ArrowLeft" : "ArrowRight");
      const branch = isBranch(entry.node);
      const open = branch && expandedSet.has(id);
      if (forward) {
        if (branch && !open) {
          event.preventDefault();
          toggleOpen(id);
        } else if (open) {
          event.preventDefault();
          const first = Array.from(
            document.getElementById(groupId(id))?.querySelectorAll<HTMLElement>(ITEM) ?? [],
          ).find((el) => !el.hasAttribute("data-disabled") && el.closest("[inert]") === null);
          focusRow(first);
        }
      } else if (open) {
        event.preventDefault();
        toggleOpen(id);
      } else if (entry.parentId !== null) {
        event.preventDefault();
        const parent = rowFor(entry.parentId);
        if (parent && !parent.hasAttribute("data-disabled")) focusRow(parent);
      }
      return;
    }

    shiftMove.current = event.shiftKey;
    if (roving.onKeyDown(event)) return;
    if (typeaheadOn) {
      const hit = typeahead.onKeyDown(event, enabledRows(), row, textOf);
      if (hit !== undefined) {
        if (hit) focusRow(hit);
        return;
      }
    }
    if (event.key === " ") {
      event.preventDefault();
      choose(id, multiple && event.shiftKey);
    }
  };

  const getTreeProps = <P extends Record<string, unknown>>(user: P = {} as P) => ({
    ...user,
    [ROOT_ATTR]: "",
    "aria-multiselectable": multiple || undefined,
    "aria-disabled": disabled || undefined,
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      (user.onKeyDown as ((e: KeyboardEvent<HTMLElement>) => void) | undefined)?.(event);
      onTreeKeyDown(event);
    },
    onFocus: (event: FocusEvent<HTMLElement>) => {
      (user.onFocus as ((e: FocusEvent<HTMLElement>) => void) | undefined)?.(event);
      roving.onFocus(event);
      const row = (event.target as Element).closest<HTMLElement>(ITEM);
      if (row?.closest(`[${ROOT_ATTR}]`) === treeRef.current) {
        const id = idOf(row);
        lastFocus.current = { id, path: [id, ...ancestorsOf(index, id)] };
      }
    },
    onBlur: (event: FocusEvent<HTMLElement>) => {
      (user.onBlur as ((e: FocusEvent<HTMLElement>) => void) | undefined)?.(event);
      roving.onBlur(event);
      const next = event.relatedTarget as Node | null;
      if (next) {
        if (!treeRef.current?.contains(next)) lastFocus.current = null;
        return;
      }
      // Focus went nowhere: the user clicked away (the row is still there) or the node was
      // removed (it is gone, and its ancestor takes focus after the render).
      const left = lastFocus.current;
      queueMicrotask(() => {
        if (left && lastFocus.current === left && rowFor(left.id) !== undefined) {
          lastFocus.current = null;
        }
      });
    },
  });

  const getItemProps = (entry: TreeEntry, groupMounted: boolean) => {
    const { node, id } = entry;
    const off = disabled || node.disabled === true;
    const branch = isBranch(node);
    const busy = loading.has(id);
    const open = branch && expandedSet.has(id) && !busy;
    const picks = mode !== "none" && isSelectable(node);
    const state: CheckState | undefined = picks && checkboxes ? checks?.get(id) : undefined;
    // Rows that do something hover; a plain leaf in a tree that selects nothing does not.
    const actionable = !off && (picks || branch || onAction !== undefined);

    const rowClick = (event: MouseEvent<HTMLElement>) => {
      if (event.defaultPrevented || off) return;
      const target = event.target as Element;
      // The sign of a leaf is an empty slot: a click there is a click on the row.
      if (branch && target.closest(`[${SIGN_ATTR}]`)) {
        toggleOpen(id);
        return;
      }
      onAction?.(id, event);
      choose(id, multiple && event.shiftKey);
      const onCheck = target.closest(`[${CHECK_ATTR}]`) !== null;
      // A click without a pointer (VoiceOver or TalkBack double-tap, a voice command) cannot aim
      // at the sign, so it opens a branch as well.
      const virtual = event.detail === 0 && event.clientX === 0 && event.clientY === 0;
      if (branch && (expandOn === "row" || virtual) && !onCheck) toggleOpen(id);
    };

    return {
      id: rowId(id),
      role: "treeitem",
      "aria-level": entry.level,
      "aria-setsize": entry.setSize,
      "aria-posinset": entry.posInSet,
      "aria-expanded": branch ? open : undefined,
      "aria-owns": groupMounted && open ? groupId(id) : undefined,
      "aria-selected": picks && !checkboxes ? selectedSet.has(id) : undefined,
      "aria-checked":
        state === undefined
          ? undefined
          : state === "mixed"
            ? ("mixed" as const)
            : state === "checked",
      "aria-disabled": off || undefined,
      "aria-current": current === id ? ("page" as const) : undefined,
      "aria-busy": busy || undefined,
      "data-value": id,
      "data-disabled": off ? "" : undefined,
      "data-text-value": node.textValue,
      "data-error": failed.has(id) ? "" : undefined,
      "data-actionable": actionable ? "" : undefined,
      onClick: rowClick,
      onMouseDown: (event: MouseEvent<HTMLElement>) => {
        // Shift+click must not select text; focus still moves to the row.
        if (event.shiftKey) {
          event.preventDefault();
          event.currentTarget.focus({ preventScroll: true });
        }
      },
    };
  };

  /** Props for the +/− sign of a row: drawn, hidden from assistive technology, a click target. */
  const getSignProps = () => ({ "aria-hidden": true as const, [SIGN_ATTR]: "" });
  /** Props for the check mark of a row. */
  const getCheckProps = () => ({ "aria-hidden": true as const, [CHECK_ATTR]: "" });

  const actions = {
    focus: (id: string): boolean => {
      const entry = index.entries.get(id);
      if (!entry || disabled) return false;
      const row = rowFor(id);
      if (row) return focusRow(row);
      // A node under a closed branch: open the branches above it, focus after the render.
      const closed = ancestorsOf(index, id).filter((a) => !expandedSet.has(a));
      pendingFocus.current = id;
      if (fold) setFolding(null);
      setExpandedList([...expandedList, ...closed]);
      return true;
    },
    scrollTo: (id: string) => {
      const root = treeRef.current;
      const row = rowFor(id);
      if (root && row) reveal(root, row, "center");
    },
    expandAll: () => {
      if (fold) setFolding(null);
      setExpandedList(
        index.order.filter((id) => {
          const node = index.entries.get(id)?.node;
          return node !== undefined && hasLoadedChildren(node);
        }),
      );
    },
    collapseAll: () => {
      if (fold) setFolding(null);
      setExpandedList([]);
    },
  };

  return {
    treeRef,
    index,
    selected,
    expanded: expandedSet,
    loading,
    failed,
    folding,
    rowId,
    groupId,
    getTreeProps,
    getItemProps,
    getSignProps,
    getCheckProps,
    actions,
  };
}

export type Tree = ReturnType<typeof useTree>;

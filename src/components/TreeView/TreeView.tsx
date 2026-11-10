import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";

import { useLabels } from "../../locale";
import { usePresence } from "../../motion/usePresence";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { hasLoadedChildren, isBranch, isSelectable, type TreeEntry, type TreeNode } from "./tree";
import { type Tree, useTree } from "./useTree";

/** Imperative handle: move focus, scroll, open or close every branch. */
export interface TreeActions {
  /** Focuses a node, opening the branches above it first. Returns whether the node exists. */
  focus: (id: string) => boolean;
  /** Scrolls the tree (never the page) so the node is centred. */
  scrollTo: (id: string) => void;
  /** Opens every branch whose children are loaded. */
  expandAll: () => void;
  /** Closes every branch. */
  collapseAll: () => void;
}

interface TreeViewBaseProps extends Omit<
  HTMLAttributes<HTMLUListElement>,
  "onChange" | "defaultValue" | "children"
> {
  /** The nodes, as data. `id` is unique across the whole tree. */
  items: readonly TreeNode[];
  /** Accessible name (sets `aria-label`). Or `aria-label` / `aria-labelledby`. */
  label?: string | undefined;
  /** Ids of the open nodes (controlled). */
  expanded?: string[] | undefined;
  /** Ids of the nodes open on first render (uncontrolled). */
  defaultExpanded?: string[] | undefined;
  /** Called with the ids of the open nodes when one opens or closes. */
  onExpandedChange?: ((expanded: string[]) => void) | undefined;
  /**
   * What a click on a parent's row does: `row` opens it, `sign` leaves that to the +/− sign. A
   * click without a pointer (a screen reader's double-tap or "click" command, which cannot aim at
   * the sign) opens a parent either way, so assistive technology users can open branches.
   * @default "row" without selection, "sign" with it
   */
  expandOn?: "row" | "sign" | undefined;
  /** Called on Enter, click or tap on a node, even when the selection does not change. */
  onAction?: ((id: string, event: SyntheticEvent) => void) | undefined;
  /**
   * Called the first time a node with `hasChildren` and no `children` opens. Return a promise to
   * show the loading row until it settles: resolve after the new `items` are passed in; a
   * rejection closes the node again and announces the failure.
   */
  onLoadChildren?: ((node: TreeNode) => unknown) | undefined;
  /** The node that marks the current location (`aria-current="page"`, an olive edge). */
  current?: string | undefined;
  /** Row height: `s` (32px, 44px on touch) or `m` (44px). @default "s" */
  size?: "s" | "m" | undefined;
  /** Draws a hairline frame around the tree. @default false */
  boxed?: boolean | undefined;
  /** Caps the height at this many rows; the tree scrolls inside itself. */
  rows?: number | undefined;
  /** Typing jumps to a node by its first letters. @default true */
  typeahead?: boolean | undefined;
  /** Shows the loading row under the nodes and marks the tree busy. */
  loading?: boolean | undefined;
  /**
   * Shown when there are no nodes. Accepts an `EmptyState size="s"`; leave its `announce` off,
   * because the tree already announces its own changes.
   * @default the locale's "No items"
   */
  empty?: ReactNode;
  /** Disables every node; the tree is no longer a tab stop. */
  disabled?: boolean | undefined;
  /** Renders one hidden input per selected id for native forms. */
  name?: string | undefined;
  /**
   * Announces bulk selection changes and lazy loads in a polite status. Set `false` when a
   * parent makes its own announcements.
   * @default true
   */
  announce?: boolean | undefined;
  /**
   * Opens and closes a branch like a folding screen (byōbu): the first rows swing flat one after
   * the other, and fold back together on close. It comes with the core stylesheet and honours
   * reduced motion through the motion tokens. Only a user's click or key (Enter, Left, Right)
   * animates a branch of 40 children or fewer; the first render, `*`, `expandAll`, controlled
   * changes and bigger branches are instant. `false` turns it off: branches open and close at once.
   * @default true
   */
  fold?: boolean | undefined;
  /** Receives `{ focus(id), scrollTo(id), expandAll(), collapseAll() }`. */
  actionRef?: Ref<TreeActions> | undefined;
}

export interface TreeViewNoneProps extends TreeViewBaseProps {
  /** No selection (the default). */
  selectionMode?: "none" | undefined;
  checkboxes?: false | undefined;
  cascade?: never;
  value?: never;
  defaultValue?: never;
  onChange?: never;
  deselectable?: never;
}

export interface TreeViewSingleProps extends TreeViewBaseProps {
  /** One selected node. */
  selectionMode: "single";
  checkboxes?: false | undefined;
  cascade?: never;
  /** Selected id (controlled); `null` is a controlled empty selection. */
  value?: string | null | undefined;
  /** Initially selected id when uncontrolled. */
  defaultValue?: string | null | undefined;
  /** Called with the new id when the selection changes. */
  onChange?: ((value: string | null) => void) | undefined;
  /** Picking the selected node again releases it. @default false */
  deselectable?: boolean | undefined;
}

export interface TreeViewMultipleProps extends TreeViewBaseProps {
  /** Several selected nodes: Space toggles, Shift+Space selects a range, Ctrl+A selects all. */
  selectionMode: "multiple";
  /** Draws a check mark per selectable node (`aria-checked`). */
  checkboxes?: boolean | undefined;
  /**
   * With `checkboxes`: checking a parent checks everything enabled under it, and a parent is
   * checked when all of them are and mixed when some are.
   * @default true
   */
  cascade?: boolean | undefined;
  /** Selected ids (controlled), in the order they were chosen. With `cascade`, parent ids are included. */
  value?: string[] | undefined;
  /** Initially selected ids when uncontrolled. */
  defaultValue?: string[] | undefined;
  /** Called with the new ids, in the order they were chosen. */
  onChange?: ((value: string[]) => void) | undefined;
  deselectable?: never;
}

export interface TreeViewCheckboxProps extends Omit<
  TreeViewMultipleProps,
  "selectionMode" | "checkboxes"
> {
  /** Draws a check mark per selectable node; implies `selectionMode="multiple"`. */
  checkboxes: true;
  selectionMode?: "multiple" | undefined;
}

export type TreeViewProps =
  TreeViewNoneProps | TreeViewSingleProps | TreeViewMultipleProps | TreeViewCheckboxProps;

const NBSP = " ";

const toArray = (value: string | string[] | null | undefined): string[] | undefined =>
  value === undefined ? undefined : value === null ? [] : Array.isArray(value) ? value : [value];

/** Beyond this many rows a branch opens at once instead of folding open. */
const FOLD_LIMIT = 40;

interface TreeContext {
  tree: Tree;
  fold: boolean;
  checkboxes: boolean;
  loadingText: string;
  failedText: (label: string) => string;
}

/**
 * An expandable hierarchy of ruled rows (APG tree): a +/− sign, an optional check mark, a label
 * with an optional description and meta, indented by level. One tab stop; Up and Down move
 * through the visible nodes, Right and Left open, close and climb, Home and End jump, typing
 * finds a node and `*` opens its siblings. It selects one node, several, or ticks checkboxes
 * whose parents follow their children; children can load on demand. Selected rows are ink, the
 * keyboard focus is the olive inset ring and `current` is an olive edge. Branches open and close
 * like a folding screen unless `fold={false}`.
 */
export const TreeView = forwardRef<HTMLUListElement, TreeViewProps>(function TreeView(props, ref) {
  const {
    items,
    label,
    selectionMode = "none",
    checkboxes = false,
    cascade,
    value,
    defaultValue,
    onChange,
    deselectable = false,
    expanded,
    defaultExpanded,
    onExpandedChange,
    expandOn,
    onAction,
    onLoadChildren,
    current,
    size = "s",
    boxed = false,
    rows,
    typeahead = true,
    loading = false,
    empty,
    disabled = false,
    name,
    announce = true,
    fold = true,
    actionRef,
    className,
    style,
    onKeyDown,
    onFocus,
    onBlur,
    ...rest
  } = props as TreeViewBaseProps & {
    selectionMode?: "none" | "single" | "multiple" | undefined;
    checkboxes?: boolean | undefined;
    cascade?: boolean | undefined;
    value?: string | string[] | null | undefined;
    defaultValue?: string | string[] | null | undefined;
    onChange?: ((value: string | string[] | null) => void) | undefined;
    deselectable?: boolean | undefined;
  };
  const t = useLabels();
  const mode = checkboxes ? "multiple" : selectionMode;

  // Live region: a repeated message gets a trailing no-break space so it is read again.
  const [message, setMessage] = useState("");
  const tree = useTree({
    items,
    mode,
    checkboxes,
    cascade: checkboxes && cascade !== false,
    selected: toArray(value),
    defaultSelected: toArray(defaultValue),
    onSelectedChange: onChange
      ? (next) => {
          onChange(mode === "multiple" ? next : (next[0] ?? null));
        }
      : undefined,
    deselectable: mode === "single" && deselectable,
    expanded,
    defaultExpanded,
    onExpandedChange,
    expandOn: expandOn ?? (mode === "none" ? "row" : "sign"),
    onAction,
    onLoadChildren,
    current,
    disabled,
    typeahead,
    fold,
    announce: announce
      ? (text) => {
          setMessage((prev) => (prev === text ? text + NBSP : text));
        }
      : undefined,
  });

  const { treeRef } = tree;
  const setRoot = useCallback(
    (node: HTMLUListElement | null) => {
      treeRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [treeRef, ref],
  );
  useImperativeHandle(actionRef, () => tree.actions);

  const named = [label, rest["aria-label"], rest["aria-labelledby"]].some(
    (v) => v !== undefined && v !== "",
  );
  useEffect(() => {
    if (named) return;
    devWarn("TreeView", "the tree needs a name; pass `label`, `aria-label` or `aria-labelledby`.");
  }, [named]);

  const filled = items.length > 0;
  const showEmpty = !filled && !loading;
  const rowsStyle = rows !== undefined ? ({ "--ol-tree-rows": rows } as CSSProperties) : undefined;
  const treeProps = tree.getTreeProps({ onKeyDown, onFocus, onBlur });
  const context: TreeContext = {
    tree,
    fold,
    checkboxes,
    loadingText: t.loading,
    failedText: t.treeLoadFailed,
  };
  // An empty tree is invalid ARIA: with no nodes the root is a plain group.
  const role = filled ? "tree" : "group";

  return (
    <>
      <ul
        aria-label={label}
        {...rest}
        {...treeProps}
        role={role}
        aria-multiselectable={filled ? treeProps["aria-multiselectable"] : undefined}
        aria-busy={loading || undefined}
        ref={setRoot}
        className={cx(
          "ol-tree",
          size === "m" && "ol-tree--m",
          boxed && "ol-tree--boxed",
          rows !== undefined && "ol-tree--rows",
          className,
        )}
        style={rowsStyle ? { ...rowsStyle, ...style } : style}
        data-state={filled ? undefined : "empty"}
      >
        <TreeNodes nodes={items} parentId={null} level={1} ctx={context} />
        {showEmpty ? (
          <li role="none">
            <span className="ol-tree__empty">{empty ?? t.treeEmpty}</span>
          </li>
        ) : null}
        {loading ? <NoteRow level={1} text={t.loading} kind="loading" /> : null}
      </ul>
      {announce ? (
        <span className="ol-tree__live ol-sr" role="status" aria-atomic="true">
          {message}
        </span>
      ) : null}
      {name !== undefined &&
        !disabled &&
        tree.selected.map((v) => <input key={v} type="hidden" name={name} value={v} />)}
    </>
  );
});

/** A plain text row inside a group: "Loading", or the failure of a load. Not a node. */
function NoteRow({
  level,
  text,
  kind,
}: {
  level: number;
  text: string;
  kind: "loading" | "failed";
}) {
  return (
    <li role="none" className="ol-tree__node">
      <span
        className={kind === "loading" ? "ol-tree__loading" : "ol-tree__failed"}
        style={{ "--ol-tree-level": level } as CSSProperties}
      >
        {text}
      </span>
    </li>
  );
}

interface TreeNodesProps {
  nodes: readonly TreeNode[];
  parentId: string | null;
  level: number;
  ctx: TreeContext;
}

function TreeNodes({ nodes, parentId, level, ctx }: TreeNodesProps) {
  return nodes.map((node, i) => (
    <TreeItem
      key={node.id}
      entry={{
        node,
        id: node.id,
        parentId,
        level,
        setSize: nodes.length,
        posInSet: i + 1,
      }}
      ctx={ctx}
    />
  ));
}

function TreeItem({ entry, ctx }: { entry: TreeEntry; ctx: TreeContext }) {
  const { tree, fold, checkboxes, loadingText, failedText } = ctx;
  const { node, id, level } = entry;
  const branch = isBranch(node);
  const busy = tree.loading.has(id);
  const open = branch && tree.expanded.has(id);
  const wanted = open && (hasLoadedChildren(node) || busy);
  const animated = fold && tree.folding === id && (node.children?.length ?? 0) <= FOLD_LIMIT;
  // With the fold the group stays mounted (and inert) until the rows have folded back.
  const presence = usePresence<HTMLUListElement>(wanted, {
    returnFocus: () => {
      document.getElementById(tree.rowId(id))?.focus({ preventScroll: true });
    },
  });
  const mounted = animated ? presence.mounted : wanted;
  const closing = animated && presence.state === "closing";

  const rowId = tree.rowId(id);
  const labelId = `${rowId}-label`;
  const descId =
    node.description !== undefined && node.description !== null ? `${rowId}-desc` : undefined;
  const metaId = node.meta !== undefined && node.meta !== null ? `${rowId}-meta` : undefined;
  // A load that failed leaves its worded cue under the node until the next try.
  const failedShown = tree.failed.has(id) && !busy;
  const failedLabel = node.textValue ?? (typeof node.label === "string" ? node.label : id);
  const itemProps = tree.getItemProps(entry, mounted);
  const checkState = itemProps["aria-checked"];

  return (
    <li role="none" className="ol-tree__node ol-fold__row">
      <div
        {...itemProps}
        className="ol-tree__item ol-fold__face"
        style={{ "--ol-tree-level": level } as CSSProperties}
        aria-labelledby={labelId}
        aria-describedby={[descId, metaId].filter(Boolean).join(" ") || undefined}
      >
        <span {...tree.getSignProps()} className="ol-tree__sign">
          {branch ? (open && !busy ? "−" : "+") : null}
        </span>
        {checkboxes ? (
          <span
            {...tree.getCheckProps()}
            className="ol-tree__check"
            data-state={
              isSelectable(node)
                ? checkState === "mixed"
                  ? "mixed"
                  : checkState === true
                    ? "checked"
                    : "unchecked"
                : "none"
            }
          />
        ) : null}
        <span className="ol-tree__text">
          <span id={labelId} className="ol-tree__label">
            {node.label}
          </span>
          {descId ? (
            <span id={descId} className="ol-tree__desc">
              {node.description}
            </span>
          ) : null}
        </span>
        {metaId ? (
          <span id={metaId} className="ol-tree__meta">
            {node.meta}
          </span>
        ) : null}
      </div>
      {mounted || failedShown ? (
        <ul
          id={tree.groupId(id)}
          role="group"
          className="ol-tree__group ol-fold"
          ref={animated ? presence.setElement : undefined}
          data-state={closing ? "closing" : "open"}
          data-fold={animated ? "" : undefined}
        >
          {mounted ? (
            <TreeNodes nodes={node.children ?? []} parentId={id} level={level + 1} ctx={ctx} />
          ) : null}
          {busy ? <NoteRow level={level + 1} text={loadingText} kind="loading" /> : null}
          {failedShown ? (
            <NoteRow level={level + 1} text={failedText(failedLabel)} kind="failed" />
          ) : null}
        </ul>
      ) : null}
    </li>
  );
}

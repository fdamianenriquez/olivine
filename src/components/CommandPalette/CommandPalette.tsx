import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type KeyboardEvent,
  type Ref,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { useControllable } from "../../hooks/useControllable";
import { useImeGuard } from "../../hooks/useImeGuard";
import { useOverlay } from "../../hooks/useOverlay";
import { useLabels, useLocaleTag } from "../../locale";
import { usePresence } from "../../motion/usePresence";
import { cx } from "../../utils/cx";
import { isImeKey } from "../../utils/ime";
import {
  isBareShortcut,
  Kbd,
  KbdGroup,
  matchShortcut,
  toAriaKeyShortcuts,
  useKbdPlatform,
} from "../Kbd";
import { Portal } from "../Portal";
import { type CommandPaletteGroup, highlightRuns, type RankedItem, rankGroups } from "./search";

export type { CommandPaletteGroup, CommandPaletteItem } from "./search";

/** The words the palette writes on its own. Every field can be overridden with `labels`. */
export interface CommandPaletteLabels {
  /** Name of the dialog. */
  name: string;
  /** Default placeholder, which also names the input. */
  placeholder: string;
  /** Name of the results list. */
  results: string;
  /**
   * The empty state. A function receives the query; a string is followed by the query in
   * quotes: `Nothing matches: “kz”`.
   */
  empty: string | ((query: string) => string);
  /** Footer hint for the arrow keys. */
  move: string;
  /** Footer hint for Enter. */
  open: string;
  /** Footer hint for Escape. */
  close: string;
}

export interface CommandPaletteOwnProps {
  /** Whether the palette is open (controlled). */
  open?: boolean;
  /** Initial state when uncontrolled. @default false */
  defaultOpen?: boolean;
  /** Called when the palette opens or closes: the hotkey, Escape, the scrim or a chosen row. */
  onOpenChange?: (open: boolean) => void;
  /** Groups of rows. Empty groups are not shown. */
  groups: readonly CommandPaletteGroup[];
  /** Placeholder of the search input; it also names the input. Defaults to the locale's. */
  placeholder?: string;
  /**
   * The key that toggles the palette together with ⌘ / Ctrl: `"k"` is ⌘K or Ctrl K. A value
   * with a `+` is a full shortcut (`"mod+shift+p"`). `false` turns the hotkey off. Ignored when
   * `inline`.
   * @default "k"
   */
  hotkey?: string | false;
  /** Draws the palette in place, with no dialog, scrim or hotkey, for previews and docs. */
  inline?: boolean;
  /** Overrides for the palette's own words. */
  labels?: Partial<CommandPaletteLabels>;
  /** Extra class names on the panel. */
  className?: string;
}

export interface CommandPaletteProps
  extends
    CommandPaletteOwnProps,
    Omit<ComponentPropsWithoutRef<"div">, keyof CommandPaletteOwnProps> {}

const isEditable = (node: EventTarget | null) =>
  node instanceof HTMLElement &&
  (node.isContentEditable ||
    node.closest(
      "input, textarea, select, [contenteditable], [role=textbox], [role=searchbox], [role=combobox]",
    ) !== null);

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) (ref as { current: T | null }).current = node;
}

/** The magnifier: a ring and a handle on `currentColor`. */
function SearchGlyph() {
  return (
    <svg className="ol-cmd__glyph" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="6.5" cy="6.5" r="5" />
      <path d="M10.25 10.25 15 15" />
    </svg>
  );
}

interface PanelProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  groups: readonly CommandPaletteGroup[];
  placeholder: string;
  labels: CommandPaletteLabels;
  inline: boolean;
  state: "open" | "closing" | undefined;
  onClose: () => void;
  panelRef: Ref<HTMLDivElement>;
}

/** The search row, the results and the footer. Its state lives and dies with the dialog. */
function Panel({
  groups,
  placeholder,
  labels,
  inline,
  state,
  onClose,
  panelRef,
  className,
  ...rest
}: PanelProps) {
  const id = useId();
  const lang = useLocaleTag();
  const { noOptions } = useLabels();
  const platform = useKbdPlatform();
  const { onCompositionStart, onCompositionEnd, isComposing } = useImeGuard();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const byKey = useRef(false);

  const shown = useMemo(() => rankGroups(groups, query, lang), [groups, query, lang]);
  const flat = useMemo(() => shown.flatMap((group) => group.items), [shown]);
  // Position of each group's first row in `flat`, which is what the active index counts.
  const starts = useMemo(
    () =>
      shown.map((_, at) =>
        shown.slice(0, at).reduce((count, group) => count + group.items.length, 0),
      ),
    [shown],
  );
  const total = flat.length;
  const active = Math.min(cursor, Math.max(total - 1, 0));
  const optionId = (index: number) => `${id}-o${String(index)}`;
  const listId = `${id}-l`;
  const trimmed = query.trim();

  // Keyboard moves keep the row in view; a first row also brings its heading along.
  useEffect(() => {
    if (!byKey.current) return;
    byKey.current = false;
    const row = list.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!row) return;
    const head = row.previousElementSibling;
    const target = head?.classList.contains("ol-cmd__glabel") ? head : row;
    // jsdom has no scrollIntoView.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    target.scrollIntoView?.({ block: "nearest" });
  }, [active]);

  const run = (ranked: RankedItem | undefined) => {
    if (!ranked) return;
    // Close first, so a command that opens another layer finds focus back on the page.
    if (!inline) onClose();
    ranked.item.onSelect?.();
  };

  const move = (step: number) => {
    if (total === 0) return;
    byKey.current = true;
    setCursor((active + step + total) % total);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (isComposing(event)) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      run(flat[active]);
    } else if (event.key === "Escape") {
      if (query !== "") {
        event.preventDefault();
        setQuery("");
        setCursor(0);
      } else if (!inline) {
        event.preventDefault();
        onClose();
      }
    }
  };

  // With nothing typed there is no query to quote: the list itself is empty.
  const emptyText =
    trimmed === ""
      ? noOptions
      : typeof labels.empty === "function"
        ? labels.empty(trimmed)
        : `${labels.empty}: “${trimmed}”`;

  return (
    // The mousedown only keeps focus where it is; the input owns every interaction.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      role={inline ? undefined : "dialog"}
      aria-modal={inline ? undefined : "true"}
      aria-label={inline ? undefined : labels.name}
      data-state={state}
      {...rest}
      // Pressing a row, the glyph, the footer or the padding must not take focus from the input.
      onMouseDown={(event) => {
        rest.onMouseDown?.(event);
        if (!(event.target instanceof HTMLInputElement)) event.preventDefault();
      }}
      ref={panelRef}
      className={cx("ol-cmd", inline ? "ol-cmd--inline" : "ol-kakejiku", className)}
    >
      <div className="ol-cmd__search">
        <SearchGlyph />
        <input
          className="ol-cmd__input"
          type="text"
          role="combobox"
          aria-expanded={total > 0}
          aria-controls={total > 0 ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={total > 0 ? optionId(active) : undefined}
          aria-label={placeholder}
          placeholder={placeholder}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="go"
          data-autofocus=""
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setCursor(0);
            if (list.current) list.current.scrollTop = 0;
          }}
          onCompositionStart={onCompositionStart}
          onCompositionEnd={onCompositionEnd}
          onKeyDown={onKeyDown}
        />
        {!inline && <Kbd keys="esc" aria-hidden="true" />}
      </div>
      <div ref={list} className="ol-cmd__list">
        {total > 0 && (
          <div id={listId} role="listbox" aria-label={labels.results}>
            {shown.map((group, at) => (
              <div
                key={group.key}
                role="group"
                aria-labelledby={`${id}-g${String(group.key)}`}
                className="ol-cmd__group"
              >
                <div className="ol-cmd__glabel" id={`${id}-g${String(group.key)}`}>
                  {group.label}
                </div>
                {group.items.map((ranked, row) => {
                  const index = (starts[at] ?? 0) + row;
                  const { item } = ranked;
                  return (
                    // Options are never focused: the input owns focus and the keyboard.
                    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
                    <div
                      key={item.id}
                      id={optionId(index)}
                      role="option"
                      aria-selected={index === active}
                      aria-keyshortcuts={
                        item.kbd === undefined ? undefined : toAriaKeyShortcuts(item.kbd, platform)
                      }
                      className="ol-cmd__opt"
                      onMouseMove={() => {
                        if (index !== active) setCursor(index);
                      }}
                      onClick={() => {
                        run(ranked);
                      }}
                    >
                      <span className="ol-cmd__label">
                        {highlightRuns(item.label, ranked.indices).map((run, at) =>
                          run.hit ? (
                            <mark key={at} className="ol-cmd__hit">
                              {run.text}
                            </mark>
                          ) : (
                            run.text
                          ),
                        )}
                      </span>
                      {/* A space between the spans keeps the label and the meta apart in the name. */}
                      {item.meta != null && " "}
                      {item.meta != null && <span className="ol-cmd__meta">{item.meta}</span>}
                      {item.kbd !== undefined && (
                        <Kbd keys={item.kbd} className="ol-cmd__kbd" aria-hidden="true" />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
        <div role="status" className="ol-cmd__status">
          {total === 0 && <p className="ol-cmd__empty">{emptyText}</p>}
        </div>
      </div>
      <div className="ol-cmd__foot" aria-hidden="true">
        <span>
          <KbdGroup>
            <Kbd keys="up" />
            <Kbd keys="down" />
          </KbdGroup>
          {labels.move}
        </span>
        <span>
          <Kbd keys="enter" />
          {labels.open}
        </span>
        {!inline && (
          <span>
            <Kbd keys="esc" />
            {labels.close}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * A ⌘K / Ctrl K search over actions, records and pages. A modal that unrolls from the top of the
 * screen with an ink rod: a large search input, grouped results and a footer of key hints.
 * Focus stays in the input while ↑ / ↓ move the active row (wrapping), Enter runs it and Escape
 * clears the query, then closes. Focus goes back to where it was.
 *
 * Matching is by subsequence over the label and the `keywords`; the matched letters are
 * highlighted and the group with the best match moves to the top.
 */
export const CommandPalette = forwardRef<HTMLDivElement, CommandPaletteProps>(
  function CommandPalette(
    {
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      groups,
      placeholder,
      hotkey = "k",
      inline = false,
      labels,
      className,
      ...rest
    },
    ref,
  ) {
    const dictionary = useLabels().commandPalette;
    const t: CommandPaletteLabels = { ...dictionary, ...labels };
    const [open, setOpen] = useControllable(openProp, defaultOpen, onOpenChange);
    const platform = useKbdPlatform();
    const anchor = useRef<HTMLSpanElement>(null);
    const pressedScrim = useRef(false);

    const modalOpen = open && !inline;
    const close = useCallback(() => {
      setOpen(false);
    }, [setOpen]);
    const overlayRef = useOverlay({ open: modalOpen, onClose: close });
    const { mounted, state, setElement } = usePresence<HTMLDivElement>(modalOpen);
    const panelRef = useCallback(
      (node: HTMLDivElement | null) => {
        overlayRef(node);
        setElement(node);
        assignRef(ref, node);
      },
      [overlayRef, setElement, ref],
    );

    // ⌘K / Ctrl K toggles; the listener reads the latest state through a ref.
    const toggle = useRef<() => void>(() => undefined);
    useEffect(() => {
      toggle.current = () => {
        setOpen(!open);
      };
    });
    const shortcut = hotkey === false || hotkey === "" ? null : hotkey;
    useEffect(() => {
      if (inline || shortcut === null) return;
      const chord = shortcut.length > 1 && shortcut.includes("+") ? shortcut : `mod+${shortcut}`;
      const onKey = (event: globalThis.KeyboardEvent) => {
        if (event.defaultPrevented || event.repeat || isImeKey(event)) return;
        if (!matchShortcut(event, chord, platform)) return;
        // A key with no modifier is a typed character while a field has focus.
        if (isBareShortcut(chord) && isEditable(event.target)) return;
        event.preventDefault();
        toggle.current();
      };
      document.addEventListener("keydown", onKey);
      return () => {
        document.removeEventListener("keydown", onKey);
      };
    }, [inline, shortcut, platform]);

    const text = placeholder ?? t.placeholder;

    if (inline) {
      return (
        <Panel
          {...rest}
          groups={groups}
          placeholder={text}
          labels={t}
          inline
          state={undefined}
          onClose={close}
          panelRef={ref}
          {...(className === undefined ? null : { className })}
        />
      );
    }

    return (
      <>
        {/* Marks where the palette was rendered so the portal can keep that theme and language. */}
        <span ref={anchor} hidden />
        {mounted && (
          <Portal anchor={anchor}>
            {/* The scrim is a pointer-only convenience; Escape is the keyboard path. */}
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
            <div
              className="ol-cmd-scrim"
              data-state={state}
              onPointerDown={(event) => {
                pressedScrim.current = event.target === event.currentTarget;
              }}
              onClick={(event) => {
                const started = pressedScrim.current;
                pressedScrim.current = false;
                if (started && event.target === event.currentTarget) close();
              }}
            >
              <Panel
                {...rest}
                groups={groups}
                placeholder={text}
                labels={t}
                inline={false}
                state={state === "closed" ? "closing" : state}
                onClose={close}
                panelRef={panelRef}
                {...(className === undefined ? null : { className })}
              />
            </div>
          </Portal>
        )}
      </>
    );
  },
);

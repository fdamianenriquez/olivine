import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
} from "react";

import { useOverflow } from "../../hooks/useOverflow";
import { repeatable } from "../../hooks/useStatusMessage";
import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { Button } from "../Button";
import { useCopy } from "./useCopy";

export interface CodeBlockProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "children" | "title" | "onCopy"
> {
  /**
   * The plain source. It is what the copy button copies, what line numbers split on and the
   * default content. Pass it exactly, indentation included.
   */
  code: string;
  /**
   * Pre-rendered, pre-highlighted content that replaces the lines (the output of a
   * highlighter, MDX). `code` is still required for copying. `lineNumbers` is ignored.
   */
  children?: ReactNode;
  /**
   * Renders one line, to colour tokens while keeping line numbers, wrapping and copy. Return
   * the original `line` for lines you do not touch. An empty line keeps its height even when
   * this returns nothing for it.
   */
  renderLine?: (line: string, index: number) => ReactNode;
  /** Adds `language-<x>` on the `code` element and `data-language`, and shows it in the bar. Not translated. */
  language?: string;
  /** A file name or caption, shown in the bar and used in the copy button's name. */
  title?: string;
  /**
   * Accessible name of the scrollable region while the block overflows.
   * @default `title`, else the locale's "Code"
   */
  label?: string;
  /**
   * Shows a gutter of line numbers. They are hidden from assistive tech, cannot be selected
   * and are never copied.
   * @default false
   */
  lineNumbers?: boolean;
  /**
   * The number of the first line.
   * @default 1
   */
  startLine?: number;
  /**
   * Wraps long lines instead of scrolling sideways. Keep it off when indentation carries the
   * meaning (Python, YAML).
   * @default false
   */
  wrap?: boolean;
  /**
   * Shows the copy button in the bar.
   * @default true
   */
  copyable?: boolean;
  /**
   * Milliseconds that "Copied" or "Copy failed" stay visible.
   * @default 2000
   */
  copiedFor?: number;
  /**
   * Called after each press of the copy button with the copied string and whether the clipboard
   * accepted it. It replaces the native `onCopy` of the figure, which is not forwarded.
   */
  onCopy?: (code: string, ok: boolean) => void;
}

/** Splits on any line ending and drops the empty line a trailing newline leaves behind. */
function splitLines(code: string): string[] {
  const lines = code.split(/\r\n|\r|\n/);
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

function isBlank(node: ReactNode): boolean {
  return node === "" || node === null || node === undefined || node === false;
}

/**
 * Several lines of code in a framed block: an optional bar with the file title, the language
 * and a copy button above a scrollable, unhighlighted `pre`. When the code overflows, the
 * scroller becomes a named, keyboard-focusable region so the arrow keys scroll it; a block that
 * fits adds no tab stop. The copy button keeps focus and reports in a polite live region; if
 * the clipboard refuses, the code is selected so it can be copied by hand.
 */
export const CodeBlock = forwardRef<HTMLElement, CodeBlockProps>(function CodeBlock(
  {
    code,
    children,
    renderLine,
    language,
    title,
    label,
    lineNumbers = false,
    startLine = 1,
    wrap = false,
    copyable = true,
    copiedFor = 2000,
    onCopy,
    className,
    ...rest
  },
  ref,
) {
  const t = useLabels();
  const preRef = useRef<HTMLPreElement>(null);
  const codeRef = useRef<HTMLElement>(null);
  const overflows = useOverflow(preRef, codeRef);
  const { status, attempt, copy } = useCopy(copiedFor);

  const custom = children !== undefined && children !== null;
  const numbered = lineNumbers && !custom;
  const lines = custom ? [] : splitLines(code);
  const digits = Math.max(String(startLine).length, String(startLine + lines.length - 1).length);

  useEffect(() => {
    if (lineNumbers && custom) {
      devWarn("CodeBlock", "`lineNumbers` is ignored when `children` replaces the lines.");
    }
  }, [lineNumbers, custom]);

  const hasTitle = title !== undefined && title !== "";
  const hasBar = hasTitle || language !== undefined || copyable;
  const regionName = label ?? (hasTitle ? title : t.codeRegion);

  const selectCode = () => {
    const node = codeRef.current;
    const selection = window.getSelection();
    if (!node || !selection) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const handleCopy = async () => {
    const ok = await copy(code);
    if (!ok) selectCode();
    onCopy?.(code, ok);
  };

  // Derived from the attempt counter, so a repeat of the same result is read out again.
  const message =
    status === "idle"
      ? ""
      : repeatable(status === "copied" ? t.codeCopiedStatus : t.codeCopyFailedStatus, attempt);

  const state = (which: "idle" | "copied" | "failed", content: ReactNode) => (
    <span
      className="ol-codeblock__state"
      data-active={status === which}
      aria-hidden={status === which ? undefined : true}
    >
      {content}
    </span>
  );

  return (
    <figure
      {...rest}
      ref={ref}
      className={cx(
        "ol-codeblock",
        hasBar && "ol-codeblock--bar",
        !hasTitle && "ol-codeblock--untitled",
        numbered && "ol-codeblock--numbered",
        wrap && "ol-codeblock--wrap",
        className,
      )}
      data-state={status === "idle" ? undefined : status}
    >
      {hasTitle ? (
        <figcaption className="ol-codeblock__title" translate="no" dir="ltr">
          {title}
        </figcaption>
      ) : null}
      {language !== undefined ? (
        <span className="ol-codeblock__lang" translate="no">
          {language}
        </span>
      ) : null}
      {copyable ? (
        <Button
          variant="ghost"
          size="s"
          className="ol-codeblock__copy"
          // WCAG 2.5.3 (label in name): the visible "Copied" is not contained in "Copy code", so
          // while a result shows, the visible word is the name. The live region adds the context.
          aria-label={status === "idle" ? t.codeCopyLabel(hasTitle ? title : undefined) : undefined}
          onClick={() => {
            void handleCopy();
          }}
        >
          <span className="ol-codeblock__states">
            {state("idle", t.codeCopy)}
            {state(
              "copied",
              <>
                <span className="ol-codeblock__glyph" aria-hidden="true">
                  ✓
                </span>{" "}
                {t.codeCopied}
              </>,
            )}
            {state(
              "failed",
              <>
                <span className="ol-codeblock__glyph" aria-hidden="true">
                  ×
                </span>{" "}
                {t.codeCopyFailed}
              </>,
            )}
          </span>
        </Button>
      ) : null}
      {/* The scroller is a tab stop only while there is something to scroll to. */}
      <pre
        ref={preRef}
        translate="no"
        dir="ltr"
        className="ol-codeblock__pre"
        role={overflows ? "region" : undefined}
        aria-label={overflows ? regionName : undefined}
        // A scrolling region must be keyboard reachable.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={overflows ? 0 : undefined}
        data-overflow={overflows ? "" : undefined}
      >
        <code
          ref={codeRef}
          className={cx("ol-codeblock__code", language !== undefined && `language-${language}`)}
          data-language={language}
          style={{ "--ol-code-digits": digits } as CSSProperties}
        >
          {custom
            ? children
            : lines.map((line, index) => {
                const node = renderLine ? renderLine(line, index) : line;
                return (
                  // Lines never reorder: the position is the identity.
                  <span key={index} className="ol-codeblock__line">
                    {numbered ? (
                      <span className="ol-codeblock__no" aria-hidden="true">
                        {startLine + index}
                      </span>
                    ) : null}
                    <span className="ol-codeblock__text">
                      {line === "" && isBlank(node) ? <br /> : node}
                    </span>
                  </span>
                );
              })}
        </code>
      </pre>
      <span className="ol-codeblock__live ol-sr" role="status" aria-atomic="true">
        {message}
      </span>
    </figure>
  );
});

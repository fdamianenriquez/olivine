import {
  Children,
  type ComponentPropsWithoutRef,
  forwardRef,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { AvatarGroupContext, type AvatarSize } from "./AvatarGroupContext";
import { cjkLanguage, deriveInitials, graphemes } from "./initials";

export type { AvatarSize } from "./AvatarGroupContext";
export type AvatarInk = "shu" | "ink" | "olivo";
export type AvatarStatus = "online" | "away" | "busy" | "offline";

export interface AvatarProps extends Omit<
  ComponentPropsWithoutRef<"span">,
  "children" | "onClick"
> {
  /** The person's or organisation's name: the accessible name, and the source of the initials. */
  name: string;
  /** Photo URL. Decorative (`alt=""`): the name is on the avatar. If it fails, the seal or the initials show. */
  src?: string;
  /** Overrides the initials derived from `name` (for example "AG" for "Ana García López"). */
  initials?: string;
  /**
   * One to four kanji for a hanko seal: one is centred, two stand in one column, three or four
   * make a 2 × 2 seal. Size `xs` holds two. Shown when there is no photo or it fails.
   */
  kanji?: string;
  /**
   * Seal ink. The seal is always negative (hakubun): a solid square with the characters in paper.
   * @default "shu"
   */
  ink?: AvatarInk;
  /**
   * `xs` 24, `s` 32, `m` 44, `l` 56, `xl` 80 px. Inside an AvatarGroup the group's size wins.
   * @default "m"
   */
  size?: AvatarSize;
  /**
   * Presence: a round dot that always travels with its word. The word is in the accessible name and
   * the hover title; where status matters on touch or keyboard, use `showName` or wrap the avatar in
   * a Button with a Tooltip.
   */
  status?: AvatarStatus;
  /**
   * Shows the name, the status word and `meta` beside the mark as real text; the mark becomes
   * decorative. Ignored inside an AvatarGroup.
   * @default false
   */
  showName?: boolean;
  /** A second line after the status word with `showName`: a role, a time. */
  meta?: ReactNode;
  /**
   * Plays the hanko motion when the seal first appears. Use it on one or two avatars per view,
   * never in a list.
   * @default false
   */
  press?: boolean;
  /**
   * The language of the name: used to upper-case initials (Turkish "i" → "İ") and set on the
   * initials and the visible name. The accessible name and status word stay in the locale's language.
   */
  lang?: string;
}

/** Seals hold four kanji at most; size `xs` holds two. */
function sealCharacters(kanji: string, size: AvatarSize): string[] {
  return graphemes(kanji.trim()).slice(0, size === "xs" ? 2 : 4);
}

/**
 * Tracks whether the photo for `src` failed. The flag belongs to one `src`, so a new `src` tries
 * again. An image that failed before hydration (its `error` event fired before React listened) is
 * caught on mount: it is complete with no pixels and cannot be decoded.
 */
function usePhoto(src: string | undefined) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [lastSrc, setLastSrc] = useState(src);
  const ref = useRef<HTMLImageElement>(null);
  // A new src forgets the last failure, even when it returns to a src that failed before.
  if (lastSrc !== src) {
    setLastSrc(src);
    setFailedSrc(null);
  }
  const show = Boolean(src) && failedSrc !== src;

  useEffect(() => {
    const img = ref.current;
    if (!show || !img || !src || !img.complete || img.naturalWidth !== 0) return;
    let live = true;
    const fail = () => {
      if (live) setFailedSrc(src);
    };
    if (typeof img.decode === "function") img.decode().catch(fail);
    else fail();
    return () => {
      live = false;
    };
  }, [show, src]);

  const fail = () => {
    setFailedSrc(src ?? null);
  };
  return { show, imgRef: ref, fail };
}

/**
 * A person or organisation in a square: a photo, a hanko seal of the name in kanji, or initials on
 * paper-2, in that order of fallback. The root is `role="img"` named "{name}, {status word}"; with
 * `showName` the name and status are visible text instead. Avatar is not interactive: wrap it in a
 * Button or Link to act on the person.
 */
export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  {
    name,
    src,
    initials,
    kanji,
    ink = "shu",
    size: sizeProp = "m",
    status,
    showName: showNameProp = false,
    meta,
    press = false,
    lang,
    className,
    ...rest
  },
  ref,
) {
  const labels = useLabels();
  const group = useContext(AvatarGroupContext);
  const size = group?.size ?? sizeProp;
  const showName = showNameProp && !group;
  const { show: showPhoto, imgRef, fail: failPhoto } = usePhoto(src);

  const seal = useMemo(() => (kanji ? sealCharacters(kanji, size) : []), [kanji, size]);
  const letters = useMemo(() => {
    if (initials !== undefined) return { text: initials, cjk: cjkLanguage(initials) };
    return deriveInitials(name, lang);
  }, [initials, name, lang]);

  const kanjiCount = kanji ? graphemes(kanji.trim()).length : 0;
  useEffect(() => {
    if (kanjiCount > 4) devWarn("Avatar", "a seal holds four kanji at most; the rest are cut.");
    else if (size === "xs" && kanjiCount > 2)
      devWarn("Avatar", 'size "xs" seals hold two kanji; the rest are cut.');
  }, [kanjiCount, size]);

  const kind = showPhoto ? "image" : seal.length > 0 ? "seal" : "initials";
  const statusWord = status ? labels.avatarStatus[status] : undefined;
  const label = statusWord ? labels.avatarLabel(name, statusWord) : name;

  const mark = (
    <span
      className={cx(
        "ol-avatar",
        `ol-avatar--${size}`,
        `ol-avatar--${kind}`,
        !showName && className,
      )}
      {...(showName
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": label, title: statusWord })}
      {...(showName ? {} : rest)}
      ref={showName ? undefined : ref}
    >
      {kind === "image" && (
        <img
          ref={imgRef}
          className="ol-avatar__img"
          src={src}
          alt=""
          decoding="async"
          loading="lazy"
          onError={failPhoto}
        />
      )}
      {kind === "seal" && (
        <span
          lang="ja"
          aria-hidden="true"
          className={cx(
            "ol-stamp",
            "ol-stamp--negative",
            ink !== "ink" && `ol-stamp--${ink}`,
            seal.length === 2 && "ol-stamp--vertical",
            seal.length >= 3 && "ol-stamp--square",
            press && "ol-stamp--press",
            "ol-avatar__seal",
            `ol-avatar__seal--${String(seal.length)}`,
          )}
        >
          {seal.join("")}
        </span>
      )}
      {kind === "initials" && (
        <span
          className={cx("ol-avatar__initials", letters.cjk && "ol-avatar__initials--cjk")}
          lang={letters.cjk ?? lang}
          aria-hidden="true"
        >
          {letters.text}
        </span>
      )}
      {status && (
        <span
          className={cx("ol-avatar__status", `ol-avatar__status--${status}`)}
          aria-hidden="true"
        />
      )}
    </span>
  );

  if (!showName) return mark;
  return (
    <span ref={ref} className={cx("ol-avatar-label", className)} {...rest}>
      {mark}
      <span className="ol-avatar-label__text">
        <span className="ol-avatar-label__name" lang={lang}>
          {name}
        </span>
        {(statusWord !== undefined || meta != null) && (
          <span className="ol-avatar-label__meta">
            {statusWord}
            {statusWord !== undefined && meta != null && <span aria-hidden="true"> · </span>}
            {meta}
          </span>
        )}
      </span>
    </span>
  );
});

export interface AvatarGroupProps extends Omit<ComponentPropsWithoutRef<"span">, "children"> {
  /** The group's accessible name, for example "Luthiers on this order". Each avatar keeps its own name. */
  label: string;
  /**
   * How many avatars show before the "+N" cell.
   * @default 4
   */
  max?: number;
  /**
   * The size of every member, passed down so a wrapped Avatar gets it too.
   * @default "m"
   */
  size?: AvatarSize;
  /** `Avatar` elements. The "+N" cell names the hidden people it finds among direct `Avatar` children. */
  children: ReactNode;
}

const isAvatar = (node: ReactElement): node is ReactElement<AvatarProps> => node.type === Avatar;

/**
 * A row of avatars that share their borders, with a "+N" cell for the rest. The row is a named
 * `role="group"`; the "+N" cell is an image named "{n} more: {names}".
 */
export const AvatarGroup = forwardRef<HTMLSpanElement, AvatarGroupProps>(function AvatarGroup(
  { label, max: maxProp = 4, size = "m", className, children, ...rest },
  ref,
) {
  const labels = useLabels();
  const max = Number.isFinite(maxProp) && maxProp >= 1 ? Math.floor(maxProp) : 4;
  const all = Children.toArray(children).filter(isValidElement);
  const shown = all.slice(0, max);
  const hidden = all.slice(max);
  const hiddenNames = hidden.filter(isAvatar).map((child) => child.props.name);
  const foreign = all.some((child) => !isAvatar(child));

  useEffect(() => {
    if (foreign)
      devWarn("AvatarGroup", "children should be Avatar elements; others are not named in +N.");
  }, [foreign]);

  const context = useMemo(() => ({ size }), [size]);

  return (
    <span
      ref={ref}
      role="group"
      aria-label={label}
      className={cx("ol-avatar-group", `ol-avatar-group--${size}`, className)}
      {...rest}
    >
      <AvatarGroupContext.Provider value={context}>{shown}</AvatarGroupContext.Provider>
      {hidden.length > 0 && (
        <span
          role="img"
          aria-label={labels.avatarMore(hidden.length, hiddenNames)}
          className={cx("ol-avatar", `ol-avatar--${size}`, "ol-avatar--more")}
        >
          <span aria-hidden="true">+{hidden.length}</span>
        </span>
      )}
    </span>
  );
});

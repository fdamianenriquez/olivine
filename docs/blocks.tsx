import "./docs.css";

import type { CSSProperties, ReactNode } from "react";

import source from "../src/tokens/tokens.json";

const THEMES = [
  { id: "washi", title: "Washi · cream" },
  { id: "sumi", title: "Sumi · ebony" },
] as const;

/** Every colour token, rendered inside each theme side by side. */
export function ColorSwatches() {
  return (
    <div className="ol-docs-themes">
      {THEMES.map((theme) => (
        <section key={theme.id} className="ol ol-docs-theme" data-theme={theme.id}>
          <h3 className="ol-label ol-docs-theme__title">{theme.title}</h3>
          <ul className="ol-docs-swatches">
            {source.color.tokens.map((token) => (
              <li key={token.name} className="ol-docs-swatch">
                <span
                  className="ol-docs-swatch__chip"
                  style={{ background: `var(--${token.name})` }}
                  aria-hidden="true"
                />
                <div>
                  <p className="ol-docs-swatch__name">
                    <span>{token.name}</span>
                    <span className="ol-docs-swatch__value">{token.value[theme.id]}</span>
                  </p>
                  <p className="ol-docs-swatch__usage">{token.usage}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Every type style, set in its own face with its specification. */
export function TypeSpecimens() {
  return (
    <div className="ol ol-docs-specimens">
      {source.type.groups.flatMap((group) =>
        group.styles.map((style) => {
          const v = (part: string) => `var(--text-${style.name}-${part})`;
          const css: CSSProperties = {
            fontFamily: v("family"),
            fontSize: v("size"),
            lineHeight: v("leading"),
            fontWeight: v("weight"),
            letterSpacing: v("tracking"),
            textTransform: style.name === "label" ? "uppercase" : undefined,
          };
          return (
            <div key={style.name} className="ol-docs-specimen">
              <div className="ol-docs-specimen__meta">
                <span className="ol-label">{style.name}</span>
                <span className="ol-label">
                  {"fontSizeMin" in style ? `${style.fontSizeMin}–` : ""}
                  {style.fontSize} / {style.lineHeight}
                  {"letterSpacing" in style ? ` / ${style.letterSpacing}` : ""}
                </span>
                <span className="ol-docs-swatch__usage">{style.usage}</span>
              </div>
              <p className="ol-docs-specimen__sample" style={css}>
                {style.sample}
              </p>
            </div>
          );
        }),
      )}
    </div>
  );
}

type ScaleGroup =
  | "spacing"
  | "radius"
  | "stroke"
  | "control"
  | "layout"
  | "shadow"
  | "texture"
  | "marker"
  | "glyph"
  | "motion"
  | "underline"
  | "zIndex";

const PREVIEWS: Partial<Record<ScaleGroup, (name: string) => ReactNode>> = {
  spacing: (name) => <span className="ol-docs-bar" style={{ width: `var(--${name})` }} />,
  control: (name) => (
    <span className="ol-docs-box" style={{ width: "auto", height: `var(--${name})` }} />
  ),
  radius: (name) => <span className="ol-docs-box" style={{ borderRadius: `var(--${name})` }} />,
  stroke: (name) => <span className="ol-docs-bar" style={{ height: `var(--${name})` }} />,
  shadow: (name) => <span className="ol-docs-box" style={{ boxShadow: `var(--${name})` }} />,
};

/** One table of a non-colour token group: name, value, preview and usage. */
export function TokenTable({ group }: { group: ScaleGroup }) {
  const preview = PREVIEWS[group];
  return (
    <table className="ol ol-docs-table">
      <thead>
        <tr>
          <th className="ol-label">Token</th>
          <th className="ol-label">Value</th>
          {preview && <th className="ol-label">Preview</th>}
          <th className="ol-label">Usage</th>
        </tr>
      </thead>
      <tbody>
        {source[group].tokens.map((token) => (
          <tr key={token.name}>
            <td>
              <code>--{token.name}</code>
            </td>
            <td>
              <code>{typeof token.value === "string" ? token.value : token.value.washi}</code>
            </td>
            {preview && <td>{preview(token.name)}</td>}
            <td>{"usage" in token ? token.usage : ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

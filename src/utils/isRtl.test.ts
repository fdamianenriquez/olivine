import { afterEach, describe, expect, it } from "vitest";

import { isRtl } from "./isRtl";

describe("isRtl", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    document.documentElement.removeAttribute("dir");
  });

  it("follows the nearest dir attribute", () => {
    document.body.innerHTML = `<div dir="rtl"><p id="a"><span id="b"></span></p></div><p id="c"></p>`;
    expect(isRtl(document.getElementById("b"))).toBe(true);
    expect(isRtl(document.getElementById("c"))).toBe(false);
  });

  it("lets an inner ltr subtree win over an rtl ancestor", () => {
    document.body.innerHTML = `<div dir="rtl"><div dir="ltr"><i id="a"></i></div></div>`;
    expect(isRtl(document.getElementById("a"))).toBe(false);
  });

  it("uses the document element when there is no element target", () => {
    document.documentElement.setAttribute("dir", "rtl");
    expect(isRtl(null)).toBe(true);
    expect(isRtl(document)).toBe(true);
  });
});

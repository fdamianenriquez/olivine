// Builds the library, packs it, installs the tarball into examples/next-app and builds the app,
// so the SSR checks run against what a consumer would install.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const example = join(root, "examples/next-app");
const pack = join(example, ".pack");

const run = (cwd: string, command: string, args: string[]) => {
  execFileSync(command, args, { cwd, stdio: "inherit" });
};

run(root, "pnpm", ["build"]);

rmSync(pack, { recursive: true, force: true });
mkdirSync(pack, { recursive: true });
run(root, "pnpm", ["pack", "--pack-destination", pack]);
const tarball = readdirSync(pack).find((file) => file.endsWith(".tgz"));
if (!tarball) throw new Error("pnpm pack did not produce a tarball");
copyFileSync(join(pack, tarball), join(pack, "olivine.tgz"));

// The example is its own project: it must not inherit the root workspace or its lockfile.
run(example, "pnpm", ["install", "--ignore-workspace", "--force"]);
run(example, "pnpm", ["exec", "next", "build"]);

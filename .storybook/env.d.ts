// Stylesheets are imported for their side effects only.
declare module "*.css";

// Demo photographs are bundled by Vite.
declare module "*.webp" {
  const src: string;
  export default src;
}

/** Sub-path the app is hosted under ("" at the domain root). Set via NEXT_PUBLIC_BASE_PATH at build time. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function asset(path: string): string {
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}

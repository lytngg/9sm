"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// A link that marks itself as current. `exact` matches the path only;
// otherwise any page underneath it counts too.
export function NavLink({ href, exact, children }: { href: string; exact?: boolean; children: React.ReactNode }) {
  const path = usePathname();
  const on = exact ? path === href : path === href || path.startsWith(href + "/");
  return (
    <Link href={href} className={on ? "nl on" : "nl"} aria-current={on ? "page" : undefined}>
      {children}
    </Link>
  );
}

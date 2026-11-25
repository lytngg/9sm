"use client";

import { usePathname } from "next/navigation";
import { NavLink } from "./nav-link";

type Item = { id: string; name: string };
type Dept = { key: string; name: string };

// The left rail. Everything a person can open lives here, so there is one
// place to look. Staff find a client through All clients, which has search. Inside a client workspace it lists that workspace's pages
// and the plugins underneath.
export function SideNav({ isStaff, clients, depts }: { isStaff: boolean; clients: Item[]; depts: Dept[] }) {
  const path = usePathname();
  const open = path.match(/^\/c\/([^/]+)/)?.[1];

  const pages = (id: string) => (
    <>
      <NavLink href={`/c/${id}`} exact>
        Overview
      </NavLink>
      <NavLink href={`/c/${id}/health`}>Channel health</NavLink>
      <NavLink href={`/c/${id}/calendar`}>Calendar</NavLink>
      {isStaff ? <NavLink href={`/c/${id}/posts`}>Write posts</NavLink> : null}
      <NavLink href={`/c/${id}/hub`}>{isStaff ? "Onboarding and hub" : "Your brand"}</NavLink>
      <div className="side-label">Plugins</div>
      {depts.map((d) => (
        <NavLink key={d.key} href={d.key === "talent" ? `/c/${id}/talent` : `/c/${id}/plugins/${d.key}`}>
          {d.name}
        </NavLink>
      ))}
      <NavLink href={`/c/${id}/plugins`} exact>
        All plugins
      </NavLink>
    </>
  );

  if (!isStaff) {
    const id = open ?? clients[0]?.id;
    const current = clients.find((c) => c.id === id);
    return (
      <nav className="side-scroll">
        {current ? <div className="side-brand">{current.name}</div> : <div className="side-label">No workspace yet</div>}
        {id ? pages(id) : null}
        {clients.length > 1 ? (
          <>
            <div className="side-label">Switch brand</div>
            {clients
              .filter((c) => c.id !== id)
              .map((c) => (
                <NavLink key={c.id} href={`/c/${c.id}`}>
                  {c.name}
                </NavLink>
              ))}
          </>
        ) : null}
      </nav>
    );
  }

  return (
    <nav className="side-scroll">
      <NavLink href="/clients" exact>
        All clients
      </NavLink>
      <NavLink href="/briefs">Briefs</NavLink>
      <NavLink href="/trending" exact>
        Trending
      </NavLink>
      <NavLink href="/onboarding" exact>
        Onboarding
      </NavLink>
      <NavLink href="/talent" exact>
        Talent
      </NavLink>
      <NavLink href="/departments" exact>
        Teams
      </NavLink>
      <NavLink href="/events" exact>
        Events
      </NavLink>
      {clients
        .filter((c) => c.id === open)
        .map((c) => (
          <div key={c.id} className="side-open">
            <div className="side-brand">{c.name}</div>
            {pages(c.id)}
          </div>
        ))}
    </nav>
  );
}

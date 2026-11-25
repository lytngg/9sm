// Open demo mode: visitors with no login are signed in automatically with
// staff access. Fine while the database holds nothing real. Before real client
// data goes in, set this to false and follow the steps at the top of
// supabase/007_open_demo.sql.
export const DEMO_OPEN = true;

// Staff can look at the site the way an operator sees it.
export const VIEW_COOKIE = "view_as";
export const VIEW_CLIENT_COOKIE = "view_client";

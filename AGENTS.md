<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Reload financial state on authentication events only when the user identity changes; same-user focus events must not unmount unsaved forms.

- Centralize local calendar arithmetic, invoice due dates, cent-based installments, and financial totals in pure lib modules; screens share these rules to prevent divergent balances.
- FinanceProvider owns selected month and value visibility, and uses its loaded identity for mutations; same-user auth events preserve unsaved forms.
- Extend indefinite series on authenticated load using canonical series dates and a database uniqueness constraint; duplicate loads cannot duplicate installments.
- Keep protected account pages under the client-only _authenticated layout and protect account deletion with requireSupabaseAuth; import the admin client only inside its handler.
- Delete finance rows atomically through an auth deletion lifecycle trigger rather than new foreign keys to the managed auth schema; existing account data remains compatible.
- Keep generated integration files, route tree, and Vite configuration unchanged, and use existing dependencies for this revision.

- Store per-user categories separately while transactions retain category names; database triggers cascade renames and enforce references, and the transfer RPC moves all series atomically.
- Seed default categories only when the user has no category set; later loads preserve intentional deletions and backfill missing legacy names.

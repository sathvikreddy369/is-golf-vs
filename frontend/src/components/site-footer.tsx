export default function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-foreground/10 bg-surface-alt/70">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-6 text-sm text-foreground/70 md:flex-row md:items-center md:justify-between md:px-10">
        <p>Golf Charity Platform v1. Score tracking, monthly draws, and verified charity contribution transparency.</p>
        <p className="text-xs text-foreground/60">Built for subscribers, admins, and audited payout workflows.</p>
      </div>
    </footer>
  );
}

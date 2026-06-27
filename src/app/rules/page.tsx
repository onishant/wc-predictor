import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Scoring Rules — WC Predictor',
  description: 'How points are calculated for predictions',
};

export default function RulesPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="text-3xl font-bold text-heading mb-8">Scoring Rules</h1>

      {/* Group Stage */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-heading mb-4 flex items-center gap-2">
          <span className="text-cyan-400">⚽</span> Group Stage
        </h2>
        <div className="rounded-2xl border border-border-subtle bg-surface/60 p-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="pb-3 font-medium">Criteria</th>
                <th className="pb-3 text-right font-medium">Points</th>
              </tr>
            </thead>
            <tbody className="text-heading">
              <tr className="border-t border-border-subtle/40">
                <td className="py-2.5">Correct result (home win / draw / away win)</td>
                <td className="py-2.5 text-right font-semibold tabular-nums">+10</td>
              </tr>
              <tr className="border-t border-border-subtle/40">
                <td className="py-2.5">Correct home team score</td>
                <td className="py-2.5 text-right font-semibold tabular-nums">+5</td>
              </tr>
              <tr className="border-t border-border-subtle/40">
                <td className="py-2.5">Correct away team score</td>
                <td className="py-2.5 text-right font-semibold tabular-nums">+5</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t border-border-subtle">
                <td className="pt-3 font-semibold text-heading">Maximum per match</td>
                <td className="pt-3 text-right font-bold text-cyan-300 tabular-nums">20</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Knockout Stage */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-heading mb-4 flex items-center gap-2">
          <span className="text-cyan-400">🏆</span> Knockout Stage
        </h2>
        <div className="rounded-2xl border border-border-subtle bg-surface/60 p-5 mb-4">
          <p className="text-sm text-muted mb-4">
            For knockout matches, you predict <strong className="text-heading">three things</strong>:
          </p>
          <ol className="space-y-3 text-sm text-heading">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-xs font-bold text-cyan-300">1</span>
              <span><strong>How it&apos;s decided</strong> — Full Time, Extra Time, or Penalties</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-xs font-bold text-cyan-300">2</span>
              <span><strong>Who wins</strong> — Home or Away (no draws in knockouts)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-xs font-bold text-cyan-300">3</span>
              <span><strong>The scoreline</strong> — must match your decider:
                <br /><span className="text-muted">• Full Time / Extra Time → win score (1-0, 2-1, etc.)</span>
                <br /><span className="text-muted">• Penalties → draw score (0-0, 1-1, 2-2, etc.)</span>
              </span>
            </li>
          </ol>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-surface/60 p-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="pb-3 font-medium">Criteria</th>
                <th className="pb-3 text-right font-medium">Points</th>
              </tr>
            </thead>
            <tbody className="text-heading">
              <tr className="border-t border-border-subtle/40">
                <td className="py-2.5">Correct result (including shootout winner)</td>
                <td className="py-2.5 text-right font-semibold tabular-nums">+10</td>
              </tr>
              <tr className="border-t border-border-subtle/40">
                <td className="py-2.5">Correct home team score (at relevant stage)</td>
                <td className="py-2.5 text-right font-semibold tabular-nums">+5</td>
              </tr>
              <tr className="border-t border-border-subtle/40">
                <td className="py-2.5">Correct away team score (at relevant stage)</td>
                <td className="py-2.5 text-right font-semibold tabular-nums">+5</td>
              </tr>
              <tr className="border-t border-border-subtle/40">
                <td className="py-2.5">Correct decider (FT / ET / Pens)</td>
                <td className="py-2.5 text-right font-semibold tabular-nums">+5</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t border-border-subtle">
                <td className="pt-3 font-semibold text-heading">Maximum per match</td>
                <td className="pt-3 text-right font-bold text-cyan-300 tabular-nums">25</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* How scores settle */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-heading mb-4 flex items-center gap-2">
          <span className="text-cyan-400">📋</span> How Knockout Scores Settle
        </h2>
        <div className="rounded-2xl border border-border-subtle bg-surface/60 p-5">
          <p className="text-sm text-muted mb-3">
            Your score prediction is compared against the result at the stage you predicted:
          </p>
          <ul className="space-y-2 text-sm text-heading">
            <li className="flex items-start gap-2">
              <span>⚽</span>
              <span><strong>Full Time</strong> → settled on the 90-minute score</span>
            </li>
            <li className="flex items-start gap-2">
              <span>⏱️</span>
              <span><strong>Extra Time</strong> → settled on the 120-minute score</span>
            </li>
            <li className="flex items-start gap-2">
              <span>🎯</span>
              <span><strong>Penalties</strong> → score settled on 120-min result (always a draw), result = shootout winner</span>
            </li>
          </ul>
          <p className="mt-4 text-xs text-faint">
            Note: penalty shootout scores (e.g. 4-3) are never used for score predictions. Only the match score matters.
          </p>
        </div>
      </section>

      {/* Examples */}
      <section>
        <h2 className="text-xl font-semibold text-heading mb-4 flex items-center gap-2">
          <span className="text-cyan-400">💡</span> Examples
        </h2>
        <div className="space-y-4">
          <div className="rounded-2xl border border-border-subtle bg-surface/60 p-5">
            <p className="text-sm font-semibold text-heading mb-2">
              You predict: 2-1 Home, Extra Time
            </p>
            <p className="text-sm text-muted mb-2">
              Actual: 1-1 at 90 mins → 2-1 Home after extra time
            </p>
            <p className="text-sm text-emerald-300 font-semibold">
              ✅ Result (+10) ✅ Scores (+10) ✅ Decider (+5) = 25 points
            </p>
          </div>

          <div className="rounded-2xl border border-border-subtle bg-surface/60 p-5">
            <p className="text-sm font-semibold text-heading mb-2">
              You predict: 1-1 Draw, Penalties → Home wins
            </p>
            <p className="text-sm text-muted mb-2">
              Actual: 1-1 at 120 mins → Home wins 4-3 on pens
            </p>
            <p className="text-sm text-emerald-300 font-semibold">
              ✅ Result (+10) ✅ Scores (+10) ✅ Decider (+5) = 25 points
            </p>
          </div>

          <div className="rounded-2xl border border-border-subtle bg-surface/60 p-5">
            <p className="text-sm font-semibold text-heading mb-2">
              You predict: 2-1 Home, Penalties → Home wins
            </p>
            <p className="text-xs text-amber-300 mb-2">
              ⚠️ Invalid — penalties only allow draw scores
            </p>
            <p className="text-sm text-muted">
              The app prevents this prediction from being saved.
            </p>
          </div>

          <div className="rounded-2xl border border-border-subtle bg-surface/60 p-5">
            <p className="text-sm font-semibold text-heading mb-2">
              You predict: 1-0 Home, Full Time
            </p>
            <p className="text-sm text-muted mb-2">
              Actual: 1-1 at 90 mins → 2-1 Home after extra time
            </p>
            <p className="text-sm text-amber-300 font-semibold">
              ❌ Result (+0, draw at FT) ❌ Scores (+0) ❌ Decider (+0) = 0 points
            </p>
            <p className="text-xs text-muted mt-1">
              The match went to extra time, so your &quot;Full Time&quot; pick and score are compared against the 90-min result.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

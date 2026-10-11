"use client";

import Link from "next/link";
import { Flag } from "@/components/Flag";
import { ParentShell } from "@/components/ParentShell";
import { MIN_DAYS_ON_SET } from "@/lib/advancement";
import { CHORDS, getChord } from "@/lib/chords";

export default function HowItWorksPage() {
  return (
    <ParentShell>
      <article className="mx-auto max-w-2xl space-y-8 pb-10 leading-relaxed">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold">How it works</h1>
          <p className="text-lg text-muted">
            The Eguchi Chord Identification Method (CIM) is a daily listening game for children aged about 2 to 6. Each chord is linked to a colored flag. Over months,
            children learn to name chords by their sound alone, and later the notes inside them. The goal is absolute (perfect) pitch: recognising a note without
            a reference.
          </p>
        </header>

        <Section title="The rules this app follows">
          <ol className="list-decimal space-y-3 pl-5">
            <li>
              <strong>One chord at a time, always in the same order.</strong> Each chord has its own flag:
              <span className="mt-2 flex flex-wrap gap-1" aria-hidden="true">
                {CHORDS.filter((c) => c.group === "white").map((c) => (
                  <span key={c.id} className="h-8 w-8">
                    <Flag chord={c} className="h-full w-full" />
                  </span>
                ))}
              </span>
            </li>
            <li>
              <strong>Always the same sound.</strong> Every chord is played at exactly the same pitch, on the same piano, in the same voicing, every time. It is never
              moved up or down. In real-piano mode, the piano must be tuned to A440.
            </li>
            <li>
              <strong>Colors only.</strong> Your child never sees letters, note names or chord names during the chord stages, just flags.
            </li>
            <li>
              <strong>Short and frequent.</strong> About 20–25 chords per session (a couple of minutes), 4–5 sessions a day.
            </li>
            <li>
              <strong>Slow, sure steps.</strong> A new chord is added only after at least {MIN_DAYS_ON_SET} days on the current set <em>and</em> 100% accuracy on
              every chord in play (by default, the last 3 completed sessions all perfect), whichever takes longer. You confirm each new chord; the app never
              advances by itself.
            </li>
            <li>
              <strong>Red first, alone.</strong> At the start there is only one flag. That&apos;s on purpose: the first job is simply to link that sound to red. Then
              yellow joins, and from then on the chords come in random order (never the same one more than 3 times in a row, and every chord at least once per
              session).
            </li>
            <li>
              <strong>No single notes yet.</strong> Single-note games stay locked until all nine white-key chords are mastered.
            </li>
          </ol>
        </Section>

        <Section title="Later stages">
          <p>
            <strong>Note names.</strong> Once all nine white-key chords are mastered, the app can start naming the notes inside each chord with fixed-do solfège
            (do is always C: do re mi fa sol la ti). After your child identifies a chord, the app plays its notes one by one and shows their syllables on the flag. A
            single-note game unlocks too, where your child taps the syllable for a note.
          </p>
          <p>
            <strong>Black-key chords.</strong> Five more chords (
            {CHORDS.filter((c) => c.group === "black")
              .map((c) => c.colorName.toLowerCase())
              .join(", ")}
            ) are added one at a time with the same rules.
          </p>
          <p>Descriptions of the method disagree on which of these two comes first, so the order is a setting.</p>
        </Section>

        <Section title="Running a session">
          <ol className="list-decimal space-y-2 pl-5">
            <li>Tap <em>Start a session</em>, then the big play button, and hand over the device (or hold it together).</li>
            <li>After a short pause the chord plays. Your child taps the flag it belongs to. The speaker button plays it again.</li>
            <li>Right answer: the flag waves. There are no sound effects, because extra tones could muddle the pitches being learned.</li>
            <li>Wrong answer: nothing dramatic. The right flag lights up, the chord plays once more, and the game moves on.</li>
            <li>To stop early, press and hold the ✕ in the corner. Everything answered so far is saved.</li>
          </ol>
        </Section>

        <Section title="Keeping it playful">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Keep corrections neutral.</strong> &ldquo;That one was red&rdquo; in a calm voice, then on to the next. No &ldquo;wrong&rdquo;, no sighs.
            </li>
            <li>
              <strong>Stop while it&apos;s still fun.</strong> End on a good note, even if a session is cut short. A shorter session that ends happily is worth more
              than a full one that ends in tears.
            </li>
            <li>
              <strong>Attach sessions to daily routines:</strong> after breakfast, before the bath, after brushing teeth, before a story. Routines do the remembering
              for you.
            </li>
            <li>
              <strong>Take a break if your child resists.</strong> A few days off won&apos;t undo progress, and pushing through resistance can sour the game.
            </li>
            <li>
              <strong>Celebrate effort and showing up,</strong> not just right answers. The streak on the history page is for you as much as for them.
            </li>
            <li>
              <strong>Expect plateaus.</strong> Many children stall for weeks somewhere around 5–7 chords. That&apos;s normal.
            </li>
          </ul>
        </Section>

        <Section title="An honest note about the evidence">
          <p>
            The method rests mainly on one small study from Japan (Sakakibara, 2014, <em>Psychology of Music</em>), which followed 24 children aged 2–6 through this
            training and reported that most of those who completed it developed absolute pitch. That is encouraging, but it was a single small study without a
            comparison group, and it hasn&apos;t been independently replicated. So treat CIM as <strong>promising but unproven</strong>, and as a playful routine
            rather than a guarantee.
          </p>
          <p>
            Pair it with <strong>relative-pitch play</strong>, which helps every musician whatever happens with absolute pitch: sing familiar songs starting on
            different notes (in different keys), echo short tunes back and forth, sing the same song higher and lower, and notice when melodies go up or down. Those
            games happen away from this app; inside the app, chords never change key.
          </p>
        </Section>

        <Section title="Privacy">
          <p>
            Everything stays on this device, in your browser&apos;s storage. There are no accounts, no analytics, and no network requests once the app has loaded.
            Use <Link href="/parent/settings/" className="text-accent underline underline-offset-4">Settings → Backup</Link> to save a copy. Clearing the browser&apos;s
            site data deletes it.
          </p>
        </Section>

        <Section title="Credits">
          <p className="text-sm text-muted">
            Piano sound: <em>Salamander Grand Piano V3</em> by Alexander Holm, licensed under{" "}
            <a href="https://creativecommons.org/licenses/by/3.0/" className="underline" rel="noreferrer">
              CC BY 3.0
            </a>
            . A subset of the samples is bundled with the app (via the Tone.js audio repository). Chord voicings follow the open-source CIM trainer at
            pganssle.github.io/cim. Audio playback uses Tone.js (MIT).
          </p>
        </Section>

        <div className="flex items-center gap-3">
          <span className="h-12 w-12">
            <Flag chord={getChord("red")} className="h-full w-full" waving />
          </span>
          <Link href="/" className="rounded-xl bg-accent px-5 py-3 font-semibold text-accent-ink">
            Back to start
          </Link>
        </div>
      </article>
    </ParentShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

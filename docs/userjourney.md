# User Journeys

## Persona

**The tab hoarder.** Keeps a dozen video tabs open "to watch later" because
there's no lightweight way to note "I'll come back to this" without an
account, a bookmark folder that becomes a junk drawer, or a note-taking app
that's overkill for a link. Cares that nothing they watch leaves their
machine.

## Journey 1 — Passive save, first time

```
1. Opens a long video on some site, keeps watching.
2. 20s in: a small toast slides in, bottom-right —
   "Still watching? [thumbnail-free title] · site.com"
   [ Save to Queue ]  [ Not now ]
3. Clicks "Save to Queue".
4. Toast collapses to "✓ Saved to your Queue." then disappears
   after ~1.6s — no further action required.
5. Toolbar badge now reads "1".
```

Wireframe (toast):
```
┌──────────────────────────────────┐
│ ● Still watching?             ✕  │
│ How to Season a Cast Iron Pan    │
│ cooking-with-alex.com            │
│ [ Save to Queue ]   [ Not now ]  │
│ Adjust or turn off this prompt   │
└──────────────────────────────────┘
```

## Journey 2 — One-click add, no waiting

```
1. Watching a video, doesn't want to wait for the prompt.
2. Clicks the toolbar icon.
3. Popup opens; because the active tab has a <video>, a quick-add
   card is already there: "On this tab — [title] [Add]".
4. Clicks Add. Card disappears, item appears at the top of the list
   below, badge count increments.
```

Wireframe (popup, quick-add state):
```
┌────────────────────────────────────┐
│ ● Queue                        ⚙  │
├────────────────────────────────────┤
│ [thumb] On this tab                │
│         How to Season a Cast...    │
│                          [ Add ]   │
├────────────────────────────────────┤
│ 4 saved                  Clear all │
│ ┌──────────────────────────────┐  │
│ │[thumb] Title one          ✓ ✎ ✕│  │
│ │[thumb] Title two          ✓ ✎ ✕│  │
│ │ ...                            │  │
│ └──────────────────────────────┘  │
└────────────────────────────────────┘
```

## Journey 3 — Returning to watch

```
1. Opens the toolbar popup any time later (browser restarted since,
   doesn't matter — data persisted).
2. Scans the flat list, sorted newest-first.
3. Clicks a title → opens in a new tab, popup closes automatically.
4. Later, comes back, clicks the ✓ toggle on that item to mark it
   watched (title gets a strikethrough, stays in the list as a
   record rather than vanishing).
```

## Journey 4 — Tuning it to taste

```
1. Finds the prompt shows up too early during longer videos.
2. Clicks the ⚙ icon in the popup → opens the options page in a tab.
3. Drags the delay slider from 20s to 60s — live-updates the label
   ("Prompt after 60 seconds of playback").
4. Or flips "Prompt me while I'm watching" off entirely if they'd
   rather always use the toolbar-icon method from Journey 2.
```

## Journey 5 — Moving to a new machine

```
1. On the options page, clicks "Export as JSON" → downloads a dated
   file via the browser's normal download flow (still 100% local —
   the file goes to disk, not anywhere else).
2. Installs Queue on the new machine, opens its options page,
   clicks "Import JSON", selects the file.
3. Sees "Imported N new videos." Duplicate URLs already present are
   skipped automatically.
```

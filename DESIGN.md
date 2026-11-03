# Design: Candle Three

World: a surveyor's level book. A pale green-grey sheet on a darker ground, blue-green rules, graphite ink, one survey-stake yellow accent. Dark mode is a neutral blue-graphite night page (no green cast) with the same yellow accent. Mode: Operate (phone first, one-handed, pre-trade).

## Color
| Token | Light | Dark | Use |
|---|---|---|---|
| --ground | #e4e9e1 | #090b10 | outside the sheet |
| --sheet | #f6f8f2 | #12151c | page surface |
| --ink | #1b2226 | #eceef3 | text, heavy rules, borders |
| --muted | #55625f | #a3acbb | secondary text |
| --rule | #c8d6ce | #2a303c | hairline row rules |
| --accent | #f2c200 | #f2c200 | ticked boxes, active tab, primary button (only accent) |
| --bull | #1a7f52 | #4fcf94 | bullish, Setup valid, wins |
| --bear | #bf3a2a | #ff7d6b | bearish, No trade, losses |

## Type
- Display: Barlow Condensed 600/700, uppercase, for titles and section heads.
- Body: Public Sans 400-700.
- Measurement: Spline Sans Mono for every number, status, tag and time (tabular figures).

## Shape and depth
4px corners everywhere, hairline and 1.5px ink borders, no shadows. Sections are separated by a 2px ink rule; rows by 1px rules. No cards.

## Signature
The run bar: one cell per required item, grouped 1D / 4H / 15m / Risk. Cells fill yellow as items are ticked and close to green in sequence when the setup is valid. A ticked no-go item turns them red.

## Components
Segmented bias toggle, status box (go / stop), checklist row (28px box, 56px min height), ruled tables, dumbbell plot for item impact (two dots on a 0 to 100% axis), calendar tinted by net R, bottom tab bar (Check, Log, Stats, Terms).

## Dropdowns
No native selects. One listbox component: a popover under the field on wide screens, a bottom sheet with a title bar on phones. 48px rows, hairline separators, the selected row marked by a yellow edge and a check, optional hint text in mono on the right. Long lists (timezones) get a search box; instruments can be typed and added. Arrow keys, Home/End, Enter, Escape and type-ahead all work.

## Analyses and proof
Open analyses sit in a horizontally scrolling strip of bordered chips (name, bias arrow, progress, or a tick when valid). The active one is filled ink. Under every ticked step a proof strip shows 52px thumbnails and a dashed "Add proof" button. Tapping a thumbnail opens the native dialog lightbox. A saved trade lists the proofs side by side in a 2 to 3 column grid, each captioned with its step and section.

## Notes
History and stats ship with synthetic sample data, labelled as such, with a Clear button.

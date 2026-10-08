# X · English · short posts and replies

Voice distilled from verbatim posts by @thsottiaux, @theo, @Da7_Tech, @0xSero and @shadcn (2026, ~140 posts).

## Voice

- First line is the verdict or the stance. No greeting, no setup.
  `gpt-5.6-sol is meaningfully better in Claude Code than in Codex` · `Unpopular opinion: I don't care if most web apps look the same.`
- One claim per line; line breaks do the work connectives would.
- First-person testing with the exact model and effort: say what you ran and on what.
  `I stayed up til 2am and spent $1,000 benchmarking Jev Router so you don't have to.`
- Decide on cost, limits, speed. Bare numbers right after the claim they prove, with the unit or comparison.
  `766 tokens versus an estimated 1,170 for Claude Opus 5` · `Opus scored 20% higher in Cursor than in Claude Code.`
- Concede the other side, then pick one. `Both good models. Both far from perfect. You should use both and push their limits.`
- Quote the model's behavior when it tells the story better than a number: claude was always "yeah it's 100% done".
- End on the last fact or a short line. `Team is on a roll.` · `The difference is night and day.`
- Casing is a voice choice: all-lowercase reads casual (theo, 0xSero), sentence case with periods reads dry (Tibo, Da7em). Keep one per post.

Named patterns these accounts never use: opening with "Excited to", "Big news", "Here's what I found", 🧵; closing with "Thoughts?", "What do you think?", "Follow for more"; 🚀🔥 and hashtags; stacked "!!" or ALL CAPS; "revolutionary", "game-changing", "supercharge". Allowed emoji: one 🙃 or 🤯 at a line end, or ↓ before a link.

## Growth

- Small accounts get reach by replying under big, fresh posts on the same topic (hours old, high views), shaped as in Replies; the full post lives on the profile.
- Author diversity (xai-org/x-algorithm README, step 5): in one feed load each post after an author's first is multiplied by a decaying factor down to a floor; the production constants are not public. Space own posts a few hours apart; a day apart for the strongest ones.
- English tech audience peaks US morning, roughly 13:00–17:00 UTC.
- Up to 4 images per post. 16:9 (1600×900) shows uncropped; top data posts also use tall tables (about 4:5) when rows need the room.
- Put links and the method/caveats line in the first reply.
- A few targeted replies a day; same text pasted under many posts reads as spam.

## Replies

Sample: 18 replies (15–4,406 likes) from accounts under 5k followers under 100k+-view AI posts, Sep 2026. None of the 18 has a number in its text.

- Shortest wins: the top reply is one line of 7 words, repeating the original sentence with one word changed. `Claude suddenly stopped getting caught cheating` (80 followers, 4,406 likes under "Claude suddenly stopped cheating.")
- First words are the reaction or the claim itself, never a greeting or thanks. `I recognize this chart` (+ image, 542 likes)
- Agree with a twist on the post's own wording or product name, not plain praise. `This is amazing! Probably smart not to call it JevaScript` (897 likes)
- Disagree as a concrete counter-case in one or two sentences. `you don't actually have to bake it into a language. you can just create a function called 'feels' and call it.`
- Ask for the one missing variable when a post gives a comparison without setup. `effort lvl? why so vague on this?` (27 likes)
- Add own evidence as fragments plus media, not a paragraph. `opus 5.5 is insane ⏎ 2 days ⏎ android ⏎ you draw in real space and orbit what you made` (video)
- Length is 3–27 words; bare image or GIF replies also collect likes (98–177) but say nothing checkable, so skip them.

## Data posts

Sample: 15 self-run test posts (@PawelHuryn ×6, @ibragim_bad, @moofeez, @elliotarledge, @s_batzoglou, @AlphaSignalAI, others), 2026. Take their number layout; tone still follows Voice.

- Line 1 is the result as two numbers side by side, subject first, with the unit. `Opus 5 fixed 11 of the 45 bugs I hid in my own repo. Opus 4.8 fixed 2.` · `33 bugs fixed against 24. $1.80 against $68.`
- Line 2 or 3 is the setup: repo/tasks count, runs, effort, harness. `Setup: 10 tasks × 3 runs, High reasoning, in pi-agent and Claude Code through harbor.`
- List is one row per line, `model (effort): number`, sorted best first, fraction with its denominator, ≤6 rows. `Fable 5.1 (max): 43/105`
- A second metric gets its own list with n per row: `Sonnet 5.5 (max): 1,330 turns (n=2)`; ratios sit on their own lines: `2.24x faster than GPT-5.6 Sol (max)`
- Text carries the headline and the delta; the image carries every row (bars or table with cost and time columns, tested row boxed, one takeaway line as footer). `60 of the 105 bugs survived every model.`
- Caveat in the same post, one clause. `Disclaimer, this is just measuring on kernel optimization ability` · `results reflect one batch run at xhigh thinking effort`
- Counter-hype framing works: name the popular claim, then your rank. `Kimi K3 is getting called Fable/Sol level, and it's 7th in our tests.`
- End on the takeaway as a plain line. `Six models in, 27 of the 45 are still standing.`

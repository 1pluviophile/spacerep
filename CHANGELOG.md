v1.1.0
- 🐙 GitHub Gist Store — enter a GitHub Personal Access Token (gist scope) and an optional Gist ID in the Export tab to push/pull shared decks to/from a GitHub Gist. Leave the Gist ID blank on first push to create a new one automatically. Share the Gist ID with friends so they can pull your shared decks (read-only, no token needed). Token is stored locally and never leaves your device.

v1.0.0
- 🧠 SM-2 spaced repetition (same algorithm as Anki)
- 📚 3 course decks — ECON 233, ECON 305, MATH 232 (+ custom decks)
- ✍️ LaTeX math with spacing commands (\quad, \,, etc.)
- 💻 R code syntax highlighting
- 🖼️ Image support — paste, drag, browse, or #img URLs (auto-converts Google Drive links)
- 📅 GitHub-style heatmap with streak tracking
- 🌐 Shared decks — friends contribute cards, everyone keeps private progress
- 📤 Export to Anki (TSV) and Markdown (Notion/Obsidian)
- 📉 The curve chart:
  - Shows 4 theoretical forgetting curves (1st review through 4th+ review) — each curve decays slower as you review more, just like the real Ebbinghaus model
  - Your due cards appear as colored dots plotted where they sit on the curve based on their actual interval and estimated retention
  - Dot colors match your deck colors (purple for ECON 233, amber for ECON 305, green for MATH 232)
  - Hover over any dot to see the deck, interval, and estimated retention percentage

- 📊 The distribution bar chart below:
  - Shows how your cards are spread across interval buckets (New, <1 day, 1 day, 2-3 days, up to 2+ months)
  - Colored bars = due now, gray bars = total cards in that bucket
  - Gives you a quick sense of how many cards are in each stage of learning

- 💾 Download Backup — saves a .json file with everything: all your cards, review progress (ease, intervals, due dates), activity heatmap data, profile, and custom decks.
- 📂 Restore from Backup — pick your .json file, then choose:
  - OK (Merge) — adds new cards from the backup without overwriting existing ones. Activity data takes the higher value. Great for combining cards from different sessions.
  - Cancel (Replace) — overwrites everything with the backup. Good for a full restore.

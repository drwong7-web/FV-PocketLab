Replace the `Users` (two-person) icon on the "Players" metric card with the single-person `User` icon from lucide-react.

**Changes in `src/pages/Dashboard.tsx`:**
- Import `User` alongside `Users` from `lucide-react`.
- On line 31 (Players MetricCard), change `icon={<Users className="w-4 h-4" />}` to `icon={<User className="w-4 h-4" />}`.
- Leave the Teams card unchanged (still uses `Users`).
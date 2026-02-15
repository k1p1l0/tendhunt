# TendHunt Scripts

## Contract Count Maintenance

### Problem
The Buyer model has a cached `contractCount` field that can become stale when:
- New contracts are added
- Contracts are deleted
- Parent-child buyer relationships change
- Contract `buyerName` fields are updated

### Scripts

#### `check-contract-count.ts`
Debug script to verify contract counts for a specific buyer.

```bash
# Edit the script to change the buyer name, then run:
DOTENV_CONFIG_PATH=.env.local npx tsx --require dotenv/config \
  scripts/check-contract-count.ts
```

Shows:
- Cached `contractCount` field value
- Live query result (current actual count)
- Breakdown by `buyerId` vs `buyerName` matching

#### `fix-all-contract-counts.ts`
Batch update all buyers' cached `contractCount` fields to match live queries.

```bash
DOTENV_CONFIG_PATH=.env.local npx tsx --require dotenv/config \
  scripts/fix-all-contract-counts.ts
```

**Runtime:** ~10-15 minutes for 7,124 buyers

**Output:**
- Progress updates every 100 buyers
- Summary of total updates/unchanged
- Top 20 discrepancies sorted by magnitude

**When to run:**
- After bulk contract imports
- When you notice count mismatches in Sculptor responses
- As part of periodic maintenance (weekly/monthly)

### Future Improvements

Consider implementing:
1. **Automated cron job** to run `fix-all-contract-counts.ts` weekly
2. **Incremental updates** via MongoDB change streams
3. **Post-save hooks** in Contract model to update related buyers
4. **Remove cached field entirely** and always use live queries (current approach with fetchBuyerById already does this for API responses)

## Other Scripts

### `run-mass-enrichment.ts`
(Add documentation when implemented)

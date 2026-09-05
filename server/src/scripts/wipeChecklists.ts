// One-off command-line script (run like: `npm run wipe:checklists`) that deletes every recurring
// checklist definition — and, via ON DELETE CASCADE, every instance/item/submission/image
// generated under it — emptying the Checklist feature (Definitions, Instances, Compliance board,
// My Checklists) completely. Does NOT touch the separate ticket-linked checklist tables
// (Checklist/ChecklistItem/ChecklistTemplate in ticket.ts) — those are a different feature and
// weren't part of what this was asked to clear.
import 'dotenv/config'
import { connectDB, disconnectDB, db } from '../config/db.js'
import { checklistDefinitions } from '../db/schema/index.js'

const run = async () => {
  await connectDB()

  const deleted = await db.delete(checklistDefinitions)
  console.log(`Deleted ${deleted[0].affectedRows} checklist definition(s) (cascaded to all instances/items/submissions/images).`)

  await disconnectDB()
  process.exit(0)
}

run().catch(async (err) => {
  console.error('Wipe failed:', err)
  await disconnectDB()
  process.exit(1)
})

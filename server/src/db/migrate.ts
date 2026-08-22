// Applies every SQL file under drizzle/ (generated via `npm run db:generate`) to the
// database pointed at by DATABASE_URL. Run this once per deploy — e.g. as part of the
// cPanel deploy step, right after `npm install` and before (re)starting the app — instead
// of `drizzle-kit push`, which is meant for local iteration, not production rollouts.
import mysql from 'mysql2/promise'
import { drizzle } from 'drizzle-orm/mysql2'
import { migrate } from 'drizzle-orm/mysql2/migrator'
import { env } from '../config/env.js'

const run = async () => {
    const connection = await mysql.createConnection(env.DATABASE_URL);
    const db = drizzle(connection);

    console.log('Running pending migrations...');
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Migrations complete.');

    await connection.end();
};

run().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});

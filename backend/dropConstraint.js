const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();
  await client.query("ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;");
  console.log("Constraint dropped.");
  await client.end();
}

run();

import dotenv from "dotenv";
import postgres from "postgres";
import fs from "node:fs/promises";

dotenv.config({ path: ".env.local" });

const url = process.env.DATABASE_URL;

if (!url) {
  console.error("DATABASE_URL fehlt.");
  process.exit(1);
}

const sql = postgres(url, {
  ssl: "require",
  max: 1,
  prepare: false,
});

try {
  const schema = await fs.readFile(
    new URL("../db/schema.sql", import.meta.url),
    "utf8"
  );

  await sql.unsafe(schema);

  console.log("Database initialized successfully.");
} catch (error) {
  console.error("Database initialization failed:");
  console.error(error);
  process.exit(1);
} finally {
  await sql.end();
}
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    /*
      Las migraciones van por conexión DIRECTA, no por el pooler: usan
      locks de sesión y DDL que pgBouncer en modo transacción no soporta.
      En local DIRECT_URL no existe y cae a DATABASE_URL, que ya es directa.
    */
    url: process.env.DIRECT_URL ? env("DIRECT_URL") : env("DATABASE_URL"),
  },
});

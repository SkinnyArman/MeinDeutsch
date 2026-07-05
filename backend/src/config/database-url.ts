const LOCAL_DATABASE_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export type SafeDatabaseUrlInfo = {
  protocol: string;
  host: string;
  port: string;
  database: string;
  sslmode: string | null;
};

export const getSafeDatabaseUrlInfo = (databaseUrl: string): SafeDatabaseUrlInfo => {
  const parsed = new URL(databaseUrl);
  return {
    protocol: parsed.protocol.replace(/:$/, ""),
    host: parsed.hostname,
    port: parsed.port || "default",
    database: parsed.pathname.replace(/^\//, "") || "(none)",
    sslmode: parsed.searchParams.get("sslmode")
  };
};

export const assertProductionDatabaseUrl = (databaseUrl: string): void => {
  const parsed = new URL(databaseUrl);
  if (LOCAL_DATABASE_HOSTS.has(parsed.hostname)) {
    throw new Error(
      "DATABASE_URL points to localhost in production. Set Render backend DATABASE_URL to the external Neon Postgres connection string."
    );
  }
};

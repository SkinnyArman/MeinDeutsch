const normalizeMeta = (meta: unknown): unknown => {
  if (meta instanceof Error) {
    const withCode = meta as Error & { code?: unknown; status?: unknown; detail?: unknown };
    return {
      name: withCode.name,
      message: withCode.message,
      code: withCode.code,
      status: withCode.status,
      detail: withCode.detail,
      stack: withCode.stack
    };
  }

  return meta;
};

export const logger = {
  info: (message: string, meta?: unknown): void => {
    console.log(JSON.stringify({ level: "info", message, meta: normalizeMeta(meta), time: new Date().toISOString() }));
  },
  error: (message: string, meta?: unknown): void => {
    console.error(JSON.stringify({ level: "error", message, meta: normalizeMeta(meta), time: new Date().toISOString() }));
  }
};

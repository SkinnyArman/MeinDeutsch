export const logger = {
  info: (message: string, meta?: unknown): void => {
    console.log(JSON.stringify({ level: "info", message, meta, time: new Date().toISOString() }));
  },
  error: (message: string, meta?: unknown): void => {
    console.error(JSON.stringify({ level: "error", message, meta, time: new Date().toISOString() }));
  }
};

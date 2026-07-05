export const AUTHORIZED_EMAILS = [
  "armanwithamini@gmail.com",
  "dfeiznia@gmail.com",
  "dibasixx@gmail.com"
] as const;

export const authorizedEmailSet = new Set(AUTHORIZED_EMAILS.map((email) => email.toLowerCase()));

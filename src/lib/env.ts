import { z } from "zod";

const serverEnvSchema = z.object({
  MONGODB_URI: z.string().refine((val) => val.startsWith("mongodb"), {
    message: "MONGODB_URI must start with 'mongodb'",
  }),
  CLERK_SECRET_KEY: z.string().refine((val) => val.startsWith("sk_"), {
    message: "CLERK_SECRET_KEY must start with 'sk_'",
  }),
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().min(1),
  // Cloudflare R2 Storage
  R2_ENDPOINT: z.string().url(),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  // Anthropic Claude API
  ANTHROPIC_API_KEY: z.string().min(1),
  // Apify (LinkedIn scraping)
  APIFY_API_TOKEN: z.string().min(1),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().refine(
    (val) => val.startsWith("pk_"),
    { message: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must start with 'pk_'" }
  ),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().min(1),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().min(1),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().min(1),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().min(1),
});

const clientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL:
    process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL:
    process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
});

// Only validate server env vars on the server
const serverEnv =
  typeof window === "undefined"
    ? serverEnvSchema.parse({
        MONGODB_URI: process.env.MONGODB_URI,
        CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
        CLERK_WEBHOOK_SIGNING_SECRET:
          process.env.CLERK_WEBHOOK_SIGNING_SECRET,
        R2_ENDPOINT: process.env.R2_ENDPOINT,
        R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
        R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
        R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        APIFY_API_TOKEN: process.env.APIFY_API_TOKEN,
      })
    : ({} as z.infer<typeof serverEnvSchema>);

export const env = {
  ...clientEnv,
  ...serverEnv,
};

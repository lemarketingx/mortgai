import { register } from "node:module";

register("./esm-js-loader.mjs", import.meta.url);

const { publicLeadSchema } = await import("../lib/validation.js");

const payload = {
  lead: {
    name: "Test User",
    phone: "0501234567",
  },
};

const result = publicLeadSchema.safeParse(payload);

if (!result.success) {
  console.error("Validation failed", result.error.issues);
  process.exit(1);
}

console.log("Validation passed for payload with only name + phone.");

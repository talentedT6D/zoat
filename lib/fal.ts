import { fal } from "@fal-ai/client";

const FAL_KEY =
  process.env.FAL_KEY ||
  "4ac76d10-a9d5-4d77-96bc-da296d18c80a:5e823a9d1529f8d3f4b4ac64267fc69c";

fal.config({ credentials: FAL_KEY });

export { fal };

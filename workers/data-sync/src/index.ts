import type { Env } from "./types";

export default {
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    console.log("Data sync triggered (not yet implemented)");
  },
} satisfies ExportedHandler<Env>;

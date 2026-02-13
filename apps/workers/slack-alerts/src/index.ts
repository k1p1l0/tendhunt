import type { Env } from "./types";
import { getDb, closeDb } from "./db/client";
import { runDailyDigest } from "./stages/daily-digest";
import { runNewContractAlerts } from "./stages/new-contract-alerts";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ status: "ok", worker: "tendhunt-slack-alerts" });
    }

    if (url.pathname === "/run") {
      try {
        const db = await getDb(env.MONGODB_URI);
        const result = await runDailyDigest(db, env);
        return Response.json({ stage: "daily_digest", ...result });
      } catch (err) {
        console.error("Error running daily digest:", err);
        return Response.json(
          { error: err instanceof Error ? err.message : "Unknown error" },
          { status: 500 }
        );
      } finally {
        await closeDb();
      }
    }

    if (url.pathname === "/run-new-contracts") {
      try {
        const db = await getDb(env.MONGODB_URI);
        const result = await runNewContractAlerts(db, env);
        return Response.json({ stage: "new_contract_alerts", ...result });
      } catch (err) {
        console.error("Error running new contract alerts:", err);
        return Response.json(
          { error: err instanceof Error ? err.message : "Unknown error" },
          { status: 500 }
        );
      } finally {
        await closeDb();
      }
    }

    if (url.pathname === "/debug") {
      try {
        const db = await getDb(env.MONGODB_URI);
        const [integrationCount, configCount, digestCount, contractAlertCount] =
          await Promise.all([
            db.collection("slackintegrations").countDocuments({ isActive: true }),
            db.collection("slackalertconfigs").countDocuments({ isActive: true }),
            db
              .collection("slackalertconfigs")
              .countDocuments({ alertType: "daily_digest", isActive: true }),
            db
              .collection("slackalertconfigs")
              .countDocuments({ alertType: "new_contracts", isActive: true }),
          ]);

        return Response.json({
          worker: "tendhunt-slack-alerts",
          activeIntegrations: integrationCount,
          activeConfigs: configCount,
          digestConfigs: digestCount,
          contractAlertConfigs: contractAlertCount,
        });
      } catch (err) {
        console.error("Error in debug endpoint:", err);
        return Response.json(
          { error: err instanceof Error ? err.message : "Unknown error" },
          { status: 500 }
        );
      } finally {
        await closeDb();
      }
    }

    return new Response("tendhunt-slack-alerts worker", { status: 200 });
  },

  async scheduled(
    _controller: ScheduledController,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    console.log("Slack alerts cron triggered");

    try {
      const db = await getDb(env.MONGODB_URI);

      const digestResult = await runDailyDigest(db, env);
      console.log("Daily digest result:", digestResult);

      const contractResult = await runNewContractAlerts(db, env);
      console.log("New contract alerts result:", contractResult);
    } catch (err) {
      console.error("Slack alerts cron error:", err);
    } finally {
      await closeDb();
    }
  },
} satisfies ExportedHandler<Env>;

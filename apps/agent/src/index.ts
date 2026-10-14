export interface Env {
  AGENT_API_TOKEN?: string;
  SMS_GATEWAY_CLOUD_API_KEY?: string;
  SMS_GATEWAY_DEVICE_ID?: string;
}

export default {
  /**
   * PHASE 0 STUB. Cloudflare calls this automatically every 2 minutes
   * (see wrangler.toml [triggers]) — no PC/VPS needs to be kept on.
   * Phase 4 fills this in with: pull next-priority draft from the Hub's
   * queue API -> call the Android SMS gateway (cloud mode) -> log the send.
   */
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    console.log("Recovery Hub agent tick:", new Date().toISOString());
    // TODO (Phase 4): fetch next queued draft, send via SMS gateway, log result.
  },
};

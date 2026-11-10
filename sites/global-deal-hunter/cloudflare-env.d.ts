declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    DEAL_ADMIN_TOKEN?: string;
  }
}

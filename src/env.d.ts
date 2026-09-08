interface Env {
  SESSION: KVNamespace;
  RESEND_API_KEY: string;
}

declare namespace Cloudflare {
  interface Env {
    SESSION: KVNamespace;
    RESEND_API_KEY: string;
  }
}

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}
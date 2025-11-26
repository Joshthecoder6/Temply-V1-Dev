/// <reference types="vite/client" />
/// <reference types="@react-router/node" />

declare module "process" {
  global {
    namespace NodeJS {
      interface ProcessEnv {
        MANTLE_API_KEY?: string;
        MANTLE_APP_ID?: string;
      }
    }
  }
}

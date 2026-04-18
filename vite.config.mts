import { defineConfig } from "vite";
import angular from "@analogjs/vite-plugin-angular";

const isCI = process.env.CI === "true";

export default defineConfig(({ mode }) => ({
  plugins: [angular({ jit: false, tsconfig: "./tsconfig.spec.json" })],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["src/test-setup.ts"],
    include: ["src/**/*.spec.ts"],
    reporters: ["verbose"],
    server: {
      deps: {
        inline: ["rxfire", "@angular/fire", "@ngneat/spectator"],
      },
    },
    coverage: {
      provider: "istanbul",
      reportsDirectory: "./coverage/movingday",
      reporter: isCI ? ["text", "lcov", "json-summary"] : ["text", "html"],
      include: ["src/**/*.ts"],
      excludeAfterRemap: true,
      exclude: [
        "src/test-setup.ts",
        "src/**/*.spec.ts",
        "src/**/*.routes.ts",
        "**/*.html",
        "src/environments/**",
        "src/main.ts",
        "src/main.server.ts",
        "src/server.ts",
        "src/app/e2e-mock*.ts",
        "src/app/shared/services/mock-*.ts",
        "src/app/app.config.browser.ts",
        "src/app/app.config.server.ts",
        "src/app/app.component.ts",
        "src/app/shared/components/auth-menu/auth-menu.component.ts",
      ],
    },
  },
  define: {
    "import.meta.vitest": mode !== "production",
  },
}));

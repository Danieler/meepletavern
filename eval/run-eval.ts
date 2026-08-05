import { execSync } from "child_process";
import dotenv from "dotenv";
import path from "path";

// Cargar variables de entorno de .env.local y .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

console.log("🚀 Starting LLM Evaluation (MeepleTavern Pipeline) with Promptfoo...\n");

const args = process.argv.slice(2).join(" ");
const command = `npx promptfoo eval --config eval/promptfooconfig.yaml ${args}`;

try {
  execSync(command, {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_OPTIONS: `--import tsx ${process.env.NODE_OPTIONS || ""}`.trim()
    }
  });
  console.log("\n✅ Evaluation completed successfully. To view results in the web dashboard, run:");
  console.log("👉 npm run ai:eval:view\n");
} catch (error) {
  console.error("\n⚠️ Evaluation completed with failures or warnings.");
  console.log("👉 Inspect detailed results in the web dashboard by running: npm run ai:eval:view\n");
}

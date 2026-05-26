import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { startSyncLoop } from "@/lib/offline/sync";
import { initAppState } from "@/lib/native/app-state";
import { initBackgroundSync } from "@/lib/native/background-sync";

startSyncLoop();
initAppState();
initBackgroundSync();

createRoot(document.getElementById("root")!).render(<App />);

import { createRoot } from "react-dom/client";
import "./index.css";

const rootEl = document.getElementById("root")!;

function renderFatalError(message: string) {
  console.error("Falha ao iniciar o aplicativo:", message);
  rootEl.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif;background:#faf8f6;color:#2b2420">
      <div style="max-width:520px;text-align:center">
        <h1 style="font-size:20px;margin:0 0 12px">Não foi possível iniciar o aplicativo</h1>
        <p style="font-size:14px;line-height:1.6;color:#6b625c;margin:0 0 16px">${message}</p>
        <p style="font-size:12px;color:#8a807a;margin:0">Verifique as variáveis de ambiente e recarregue a página.</p>
      </div>
    </div>`;
}

// A configuração é validada ANTES de importar o App. Um import dinâmico que
// falha pode ser capturado; um import estático quebrado deixaria a página em
// branco sem qualquer mensagem.
const missing = [
  !import.meta.env.VITE_SUPABASE_URL && 'VITE_SUPABASE_URL',
  !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY && 'VITE_SUPABASE_PUBLISHABLE_KEY',
].filter(Boolean) as string[];

async function bootstrap() {
  if (missing.length > 0) {
    renderFatalError(
      `Configuração ausente: ${missing.join(', ')}. ` +
      'Defina estas variáveis no Vercel (Project Settings > Environment Variables) e faça um novo deploy.',
    );
    return;
  }

  try {
    const { default: App } = await import("./App.tsx");
    createRoot(rootEl).render(<App />);
  } catch (error) {
    renderFatalError(error instanceof Error ? error.message : String(error));
  }
}

void bootstrap();

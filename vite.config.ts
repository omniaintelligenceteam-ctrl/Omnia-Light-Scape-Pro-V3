import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  // Prioritize VITE_GEMINI_API_KEY as it's the specific one for this app, then fallback to generic API_KEY
  const apiKey = env.VITE_GEMINI_API_KEY || env.API_KEY || process.env.API_KEY;
  
  return {
    plugins: [react()],
    define: {
      // Polyfill process.env for the Google GenAI SDK and general usage
      'process.env': {
        API_KEY: JSON.stringify(apiKey)
      }
    }
  };
});
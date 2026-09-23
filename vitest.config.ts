import { defineConfig } from 'vitest/config';

// Strefa czasowa przypięta na stałe, żeby daty rat liczyły się identycznie
// na każdej maszynie, w GitHub Actions i na Vercel (tam domyślnie jest UTC).
process.env.TZ = 'Europe/Warsaw';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});

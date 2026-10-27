import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Raiz HTML da versão web. Declara o idioma como português e desliga a tradução automática do navegador:
// o Chrome traduzia o app (que estava marcado como "en") e isso quebra o React quando o texto muda.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR" translate="no" className="notranslate">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="google" content="notranslate" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
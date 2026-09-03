import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Custom web root layout for Expo Router.
 * Configures the HTML <head> with updated branding and metadata.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        <title>Connect GOD - BK Kozhikode Official App</title>
        <meta
          name="description"
          content="Connect GOD - BK Kozhikode Official App. Daily Murli, Varadan, Swaman, Traffic Control Chimes, and Meditation."
        />
        <meta name="theme-color" content="#991b1b" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />

        {/* Expo ScrollView Reset for responsive web */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}

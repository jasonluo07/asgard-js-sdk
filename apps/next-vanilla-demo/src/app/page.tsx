'use client';

import { TestComponent, SimpleChatbot } from '~/components';
import styles from './page.module.css';

export default function Home(): JSX.Element {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>Asgard SDK Demo</h1>
            <span className={styles.badge}>Next.js 15</span>
          </div>
          <nav className={styles.nav}>
            <a href="#features" className={styles.navLink}>
              Features
            </a>
            <a href="#components" className={styles.navLink}>
              Components
            </a>
            <a href="#documentation" className={styles.navLink}>
              Docs
            </a>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.content}>
          <section className={styles.hero}>
            <h2 className={styles.heroTitle}>Next.js Vanilla Demo</h2>
            <p className={styles.heroDescription}>
              A demonstration of the Asgard JS SDK integration with Next.js,
              using vanilla CSS instead of CSS frameworks for maximum control
              and minimal dependencies.
            </p>
            <div className={styles.buttonGroup}>
              <button className={styles.buttonPrimary}>Get Started</button>
              <button className={styles.buttonSecondary}>View Source</button>
            </div>
          </section>

          <section className={styles.section}>
            <TestComponent message="Path alias '~/*' is working correctly!" />
          </section>

          <section id="features" className={styles.section}>
            <div className={styles.card}>
              <h3 className={styles.sectionTitle}>Features Demonstrated</h3>
              <div className={styles.grid}>
                <div>
                  <div className={styles.featureItem}>
                    <div className={styles.checkIcon}>✓</div>
                    <span className={styles.featureText}>
                      TypeScript support with strict mode
                    </span>
                  </div>
                </div>
                <div>
                  <div className={styles.featureItem}>
                    <div className={styles.checkIcon}>✓</div>
                    <span className={styles.featureText}>
                      App Router with src directory structure
                    </span>
                  </div>
                </div>
                <div>
                  <div className={styles.featureItem}>
                    <div className={styles.checkIcon}>✓</div>
                    <span className={styles.featureText}>
                      Vanilla CSS with dark mode support
                    </span>
                  </div>
                </div>
                <div>
                  <div className={styles.featureItem}>
                    <div className={styles.checkIcon}>✓</div>
                    <span className={styles.featureText}>
                      Custom path alias configuration (~/{''})
                    </span>
                  </div>
                </div>
                <div>
                  <div className={styles.featureItem}>
                    <div className={styles.checkIcon}>✓</div>
                    <span className={styles.featureText}>
                      Standard Webpack (no Turbopack)
                    </span>
                  </div>
                </div>
                <div>
                  <div className={styles.featureItem}>
                    <div className={styles.checkIcon}>✓</div>
                    <span className={styles.featureText}>
                      Custom port configuration (4301)
                    </span>
                  </div>
                </div>
                <div>
                  <div className={styles.featureItem}>
                    <div className={styles.checkIcon}>✓</div>
                    <span className={styles.featureText}>
                      Asgard Chatbot integration
                    </span>
                  </div>
                </div>
                <div>
                  <div className={styles.featureItem}>
                    <div className={styles.checkIcon}>✓</div>
                    <span className={styles.featureText}>
                      Responsive mobile-first design
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <div className={styles.chatbotContainer}>
        <SimpleChatbot />
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: "Privacy Notice | Verchor",
  description: "How Verchor handles information collected through its company website.",
};

const sections = [
  {
    title: "Scope",
    content:
      "This notice applies to the Verchor website at varoxel.com. A Verchor product or service may provide a separate notice when it handles information for a particular purpose.",
  },
  {
    title: "Information we receive",
    content:
      "We may receive information you choose to send us, such as your name, email address, company name, and message. Our website providers may also process basic technical information needed to operate and protect the site, including browser type, IP address, pages requested, and the time of a request.",
  },
  {
    title: "How we use information",
    content:
      "We use information to respond to requests, maintain and secure the website, understand its performance, improve our services, and meet legal obligations.",
  },
  {
    title: "Service providers",
    content:
      "Verchor may use service providers to host, secure, and maintain the website. These providers may process information only as needed to provide their services to Verchor or to meet legal obligations.",
  },
  {
    title: "Retention and security",
    content:
      "We keep information only for as long as needed for the purposes described in this notice, our operations, or applicable law. We use reasonable technical and organizational safeguards, but no internet service can guarantee absolute security.",
  },
  {
    title: "Your choices",
    content:
      "Depending on where you live, you may have rights to request access to, correction of, or deletion of personal information. We will handle requests in line with applicable law.",
  },
  {
    title: "Updates to this notice",
    content:
      "If this notice changes, we will publish the updated version here and change the date at the top of this page.",
  },
];

export default function CompanyPrivacyPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/company" aria-label="Verchor home">
          VAROXEL
        </Link>
        <Link className={styles.backLink} href="/company">Company site</Link>
      </header>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>Verchor</p>
        <h1>Privacy notice</h1>
        <p className={styles.summary}>
          This notice explains how Verchor handles information collected through its company website.
        </p>
        <p className={styles.updated}>Last updated: July 20, 2026</p>
      </section>

      <article className={styles.notice}>
        {sections.map(({ title, content }, index) => (
          <section className={styles.section} key={title}>
            <span className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h2>{title}</h2>
              <p>{content}</p>
            </div>
          </section>
        ))}

        <section className={styles.contact}>
          <h2>Privacy questions</h2>
          <p>
            For a privacy request or question about this notice, contact Verchor at{" "}
            <a href="mailto:admin@varoxel.com">admin@varoxel.com</a>.
          </p>
        </section>
      </article>

      <footer className={styles.footer}>
        <span>(c) {new Date().getFullYear()} Verchor</span>
        <div className={styles.footerLinks}>
          <Link href="/company/terms">Terms</Link>
          <Link href="/company">Verchor</Link>
        </div>
      </footer>
    </main>
  );
}

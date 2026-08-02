import type { Metadata } from "next";
import Link from "next/link";
import styles from "../privacy/privacy.module.css";

export const metadata: Metadata = {
  title: "Terms of Use | Verchor",
  description: "Terms for using the Verchor company website.",
};

const sections = [
  {
    title: "Scope",
    content:
      "These terms apply to the Verchor website at varoxel.com. A Verchor product or service may provide separate terms that apply when you use that product or service.",
  },
  {
    title: "Use of this website",
    content:
      "You may use this website for lawful purposes and in a way that does not interfere with its security, availability, or operation. You may not attempt to gain unauthorized access to the website or its supporting systems.",
  },
  {
    title: "Website content",
    content:
      "The website and its content, including its design, text, graphics, and trademarks, are owned by Verchor or its licensors and are protected by applicable law. You may not copy, modify, or use that content beyond what applicable law permits without written permission.",
  },
  {
    title: "Third party services",
    content:
      "This website may link to third party websites or services. Verchor does not control those services and is not responsible for their content, availability, or practices. Their own terms and privacy notices apply.",
  },
  {
    title: "Availability and changes",
    content:
      "We work to keep the website accurate and available, but it may change, be interrupted, or be removed without notice. The website is provided as available, to the extent permitted by law.",
  },
  {
    title: "Changes to these terms",
    content:
      "If we update these terms, we will publish the revised version here and change the date at the top of this page. By continuing to use the website after an update, you agree to the revised terms.",
  },
];

export default function CompanyTermsPage() {
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
        <h1>Terms of use</h1>
        <p className={styles.summary}>
          These terms explain the rules for using the Verchor company website.
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
          <h2>Questions about these terms</h2>
          <p>
            For a question about these terms, contact Verchor at{" "}
            <a href="mailto:admin@varoxel.com">admin@varoxel.com</a>.
          </p>
        </section>
      </article>

      <footer className={styles.footer}>
        <span>(c) {new Date().getFullYear()} Verchor</span>
        <div className={styles.footerLinks}>
          <Link href="/company/privacy">Privacy</Link>
          <Link href="/company">Verchor</Link>
        </div>
      </footer>
    </main>
  );
}

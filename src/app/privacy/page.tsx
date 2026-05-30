import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — ProcureTrack',
  description: 'How ProcureTrack collects, uses, stores, and protects your personal data — published under the DPDP Act 2023 and IT Act 2000.',
  robots: { index: true, follow: true },
};

const css = `
  :root {
    --ink: #1a1a1a;
    --ink-soft: #4a4a4a;
    --rule: #d4d4d4;
    --accent: #b8860b;
    --bg: #fafaf7;
    --bg-card: #ffffff;
  }
  .legal-page * { box-sizing: border-box; }
  .legal-page {
    background: var(--bg);
    color: var(--ink);
    font-family: Georgia, "Times New Roman", serif;
    font-size: 17px;
    line-height: 1.65;
    -webkit-font-smoothing: antialiased;
    min-height: 100vh;
  }
  .legal-topbar {
    background: #fff;
    border-bottom: 1px solid var(--rule);
    padding: 14px 28px;
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-size: 13px;
  }
  .legal-topbar a { color: var(--accent); text-decoration: none; font-weight: 600; }
  .legal-topbar a:hover { text-decoration: underline; }
  .wrap {
    max-width: 760px;
    margin: 0 auto;
    padding: 64px 28px 96px;
  }
  .legal-page header {
    border-bottom: 2px solid var(--ink);
    padding-bottom: 28px;
    margin-bottom: 48px;
  }
  .eyebrow {
    font-family: "Helvetica Neue", Arial, sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 11px;
    color: var(--accent);
    font-weight: 600;
    margin-bottom: 12px;
  }
  .legal-page h1 {
    font-size: 38px;
    line-height: 1.15;
    margin: 0 0 12px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  .meta {
    color: var(--ink-soft);
    font-size: 14px;
    font-family: "Helvetica Neue", Arial, sans-serif;
  }
  .legal-page h2 {
    font-size: 22px;
    margin: 48px 0 14px;
    padding-top: 24px;
    border-top: 1px solid var(--rule);
    font-weight: 700;
    letter-spacing: -0.005em;
  }
  .legal-page h2 .num {
    color: var(--accent);
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-weight: 500;
    margin-right: 10px;
    font-size: 18px;
  }
  .legal-page h3 {
    font-size: 17px;
    margin: 28px 0 8px;
    font-weight: 700;
  }
  .legal-page p { margin: 0 0 14px; }
  .legal-page ul, .legal-page ol { padding-left: 22px; margin: 0 0 16px; }
  .legal-page li { margin-bottom: 8px; }
  .lead {
    font-size: 18px;
    color: var(--ink-soft);
    font-style: italic;
    border-left: 3px solid var(--accent);
    padding: 4px 0 4px 18px;
    margin: 0 0 32px;
  }
  .legal-page table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0 20px;
    font-size: 15px;
  }
  .legal-page th, .legal-page td {
    text-align: left;
    padding: 12px 14px;
    border-bottom: 1px solid var(--rule);
    vertical-align: top;
  }
  .legal-page th {
    background: #f0ede4;
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-weight: 600;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .callout {
    background: var(--bg-card);
    border: 1px solid var(--rule);
    border-left: 3px solid var(--accent);
    padding: 18px 22px;
    margin: 24px 0;
    font-size: 15.5px;
  }
  .callout strong { display: block; margin-bottom: 6px; font-family: "Helvetica Neue", Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.08em; font-size: 12px; color: var(--accent); }
  .legal-page footer {
    margin-top: 64px;
    padding-top: 24px;
    border-top: 2px solid var(--ink);
    font-size: 14px;
    color: var(--ink-soft);
    font-family: "Helvetica Neue", Arial, sans-serif;
  }
  .legal-page a { color: var(--accent); text-decoration: underline; text-underline-offset: 3px; }
  @media (max-width: 600px) {
    .wrap { padding: 40px 20px 64px; }
    .legal-page h1 { font-size: 30px; }
    .legal-page { font-size: 16px; }
    .legal-topbar { padding: 12px 20px; }
  }
`;

export default function PrivacyPage() {
  return (
    <div className="legal-page">
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="legal-topbar">
        <a href="/">← Back to ProcureTrack</a>
        &nbsp;&nbsp;·&nbsp;&nbsp;
        <a href="/terms">Terms of Use</a>
      </div>

      <div className="wrap">
        <header>
          <div className="eyebrow">Legal · ProcureTrack</div>
          <h1>Privacy Policy</h1>
          <div className="meta">Effective Date: 30 May 2026 &nbsp;·&nbsp; Last Updated: 30 May 2026</div>
        </header>

        <p className="lead">This Privacy Policy explains how ProcureTrack collects, uses, stores, shares, and protects your personal data. It is published in accordance with the Digital Personal Data Protection Act, 2023, the Information Technology Act, 2000, and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011.</p>

        <h2><span className="num">01</span>Who We Are</h2>
        <p>ProcureTrack ("ProcureTrack", "we", "us", "our") is a construction procurement management platform currently operated by <strong>Avon Kumar Sahni, sole proprietor</strong>, with operations to be transferred to a Private Limited company upon its incorporation. The transferee entity will assume all obligations under this Policy without diminishing any user right.</p>
        <p><strong>Registered correspondence address:</strong> Ardee City, Gurugram, Haryana, India.<br />
        <strong>Email:</strong> <a href="mailto:admin@procuretrack.in">admin@procuretrack.in</a></p>

        <h2><span className="num">02</span>Scope and Applicability</h2>
        <p>This Policy applies to all users of the ProcureTrack web application, its sub-domains, and any related services (collectively, the "Service"). By accessing or using the Service, you confirm that you have read this Policy and consent to the practices described.</p>
        <p>The Service is intended for business use by construction firms, contractors, consultants, suppliers, and their authorised personnel. It is not directed at children under the age of 18, and we do not knowingly collect data from minors.</p>

        <h2><span className="num">03</span>What We Mean By "Personal Data"</h2>
        <p>"Personal data" means any data about an individual who is identifiable by or in relation to such data, as defined under Section 2(t) of the Digital Personal Data Protection Act, 2023. "Sensitive personal data or information" carries the meaning given under Rule 3 of the SPDI Rules, 2011.</p>

        <h2><span className="num">04</span>Data We Collect</h2>

        <h3>4.1 Information You Provide Directly</h3>
        <table>
          <tbody>
            <tr><th>Category</th><th>Examples</th></tr>
            <tr><td>Identity &amp; Contact</td><td>Name, designation, employer, business email, mobile number, postal address</td></tr>
            <tr><td>Account Credentials</td><td>Username, encrypted password, authentication tokens</td></tr>
            <tr><td>Business Data</td><td>Project information, bills of quantity (BOQ), vendor master records, purchase orders, rate contracts, invoices, payment status, GSTIN, PAN of business entities</td></tr>
            <tr><td>Billing Data</td><td>Subscription plan, invoice address, GSTIN (for tax invoicing); payment instrument details are handled directly by our payment partners and are not stored by us</td></tr>
            <tr><td>Communications</td><td>Support tickets, queries, feedback, and any correspondence with us</td></tr>
          </tbody>
        </table>

        <h3>4.2 Information Collected Automatically</h3>
        <p>When you use the Service we automatically collect: IP address, device and browser identifiers, operating system, access timestamps, pages viewed, click events, error logs, and similar technical information. We use cookies and similar technologies for session management, security, and basic usage analytics.</p>

        <h3>4.3 Information from Third Parties</h3>
        <p>We may receive data from authentication providers (where you sign in via a third-party account) and from your employer organisation if it has enrolled you on the Service.</p>

        <div className="callout">
          <strong>Note on Business Data</strong>
          Most data you upload to the Service relates to commercial entities rather than identifiable natural persons, and may not constitute "personal data" under the DPDP Act, 2023. We nevertheless apply the same security and confidentiality safeguards to such commercial data as we do to personal data.
        </div>

        <h2><span className="num">05</span>Purpose and Legal Basis</h2>
        <p>We process personal data for the following purposes, and rely on the lawful grounds indicated below as required by Sections 4 to 7 of the DPDP Act, 2023:</p>
        <table>
          <tbody>
            <tr><th>Purpose</th><th>Lawful Ground</th></tr>
            <tr><td>To create and operate your account</td><td>Consent &amp; contractual necessity</td></tr>
            <tr><td>To provide procurement, vendor, and project management features</td><td>Consent &amp; contractual necessity</td></tr>
            <tr><td>To process subscription payments and issue tax invoices</td><td>Legal obligation (GST law) &amp; contractual necessity</td></tr>
            <tr><td>To provide customer support</td><td>Consent &amp; legitimate use</td></tr>
            <tr><td>To send service notifications, security alerts, and policy updates</td><td>Contractual necessity</td></tr>
            <tr><td>To improve product performance, diagnose errors, and maintain security</td><td>Legitimate use under Section 7 of the DPDP Act</td></tr>
            <tr><td>To comply with law, court orders, and government directions</td><td>Legal obligation</td></tr>
            <tr><td>To send marketing or product update communications</td><td>Consent (with opt-out)</td></tr>
          </tbody>
        </table>

        <h2><span className="num">06</span>Third-Party Service Providers (Data Processors)</h2>
        <p>We engage the following categories of service providers to operate the Service. Each is contractually required to process personal data only on our documented instructions and to apply appropriate security safeguards:</p>
        <table>
          <tbody>
            <tr><th>Provider</th><th>Purpose</th><th>Data Accessed</th><th>Location</th></tr>
            <tr><td>Razorpay Software Private Limited</td><td>Payment processing</td><td>Billing name, contact, payment instrument details</td><td>India</td></tr>
            <tr><td>PayU Payments Private Limited</td><td>Payment processing (alternate gateway)</td><td>Billing name, contact, payment instrument details</td><td>India</td></tr>
            <tr><td>Google LLC / Google India Private Limited</td><td>Authentication, email delivery, usage analytics</td><td>Account email, IP address, usage events</td><td>Servers located within and outside India</td></tr>
            <tr><td>Supabase Inc.</td><td>Application and database hosting</td><td>All Service data</td><td>AWS ap-south-1 (Mumbai, India)</td></tr>
            <tr><td>Vercel Inc.</td><td>Application delivery and edge network</td><td>Request data, IP address</td><td>Global CDN; primary region configurable</td></tr>
            <tr><td>Anthropic PBC ("Claude" API) — <em>planned, not yet active</em></td><td>AI-assisted features such as document parsing, classification, and drafting suggestions</td><td>Only the specific document or text snippet you submit to the AI feature; will be invoked only after you opt in</td><td>Outside India</td></tr>
          </tbody>
        </table>

        <div className="callout">
          <strong>AI Features Disclosure</strong>
          We plan to introduce AI-assisted features powered by the Anthropic Claude API. When activated, this will cause selected content (such as a document you submit to the feature) to be transferred outside India for processing. We will obtain your explicit consent before any such transfer occurs, and you will be able to use the rest of the Service without enabling AI features. Per Anthropic&apos;s commercial terms, data submitted to the Claude API is not used to train its models.
        </div>

        <h2><span className="num">07</span>Cross-Border Data Transfer</h2>
        <p>Some of our service providers (notably Google, Vercel, and in future Anthropic) operate infrastructure located outside India. By accepting this Policy, you acknowledge that your personal data may be transferred to, stored in, or processed in countries other than India. Such transfers are made in accordance with Section 16 of the DPDP Act, 2023, and we do not transfer personal data to any country that the Central Government may, by notification, restrict.</p>
        <p>Our primary application database is hosted on Supabase infrastructure located in AWS ap-south-1 (Mumbai, India).</p>

        <h2><span className="num">08</span>Data Retention</h2>
        <p>We retain personal data only for as long as necessary to fulfil the purpose for which it was collected, or as required by applicable law (whichever is longer):</p>
        <ul>
          <li><strong>Account data</strong> — for the duration of your active subscription, plus 90 days after termination to allow for export and reactivation.</li>
          <li><strong>Trial accounts</strong> — account and all associated data are permanently deleted 14 days after the trial period expires if no paid subscription is taken up.</li>
          <li><strong>Business data uploaded by you</strong> — for the duration of your active subscription; deleted within 90 days of account closure unless you request earlier deletion.</li>
          <li><strong>Tax invoices and billing records</strong> — for 8 years from the end of the relevant financial year, as required under Section 36 of the CGST Act, 2017.</li>
          <li><strong>Server logs and security records</strong> — typically 180 days.</li>
        </ul>
        <p>After the applicable retention period, personal data is securely deleted or irreversibly anonymised.</p>

        <h2><span className="num">09</span>Your Rights as a Data Principal</h2>
        <p>Subject to verification of identity and the limits of applicable law, you have the following rights under the DPDP Act, 2023:</p>
        <ul>
          <li><strong>Right to access</strong> a summary of your personal data and how it is processed (Section 11).</li>
          <li><strong>Right to correction and erasure</strong> of inaccurate, incomplete, or out-of-date personal data (Section 12).</li>
          <li><strong>Right of grievance redressal</strong>, exercisable through the contact below (Section 13).</li>
          <li><strong>Right to nominate</strong> another individual to exercise these rights in the event of your death or incapacity (Section 14).</li>
          <li><strong>Right to withdraw consent</strong> at any time, where processing is based on consent (Section 6). Withdrawal does not affect prior lawful processing.</li>
        </ul>
        <p>To exercise any of these rights, write to our Grievance Officer (Section 13 below). We will respond within the timelines prescribed under the DPDP Rules.</p>

        <h2><span className="num">10</span>Security Practices</h2>
        <p>We follow reasonable security practices and procedures consistent with Rule 8 of the SPDI Rules, 2011, including:</p>
        <ul>
          <li>Encryption in transit (TLS 1.2 or higher) for all data exchanged between your device and the Service.</li>
          <li>Encryption at rest for the application database.</li>
          <li>Row-level security (RLS) ensuring each organisation&apos;s data is strictly isolated from all other organisations.</li>
          <li>Role-based access control and the principle of least privilege for internal personnel.</li>
          <li>Routine backups, security patching, and vulnerability monitoring.</li>
          <li>Confidentiality obligations on all personnel and contractors.</li>
        </ul>
        <p>No system can be guaranteed perfectly secure. You are responsible for keeping your account credentials confidential and for notifying us promptly of any suspected unauthorised access.</p>

        <h2><span className="num">11</span>Personal Data Breach Notification</h2>
        <p>In the event of a personal data breach, we will notify the Data Protection Board of India and affected users in the manner and within the timelines prescribed under the DPDP Act, 2023 and CERT-In Directions dated 28 April 2022.</p>

        <h2><span className="num">12</span>Cookies</h2>
        <p>We use only essential and analytical cookies. Essential cookies are required for authentication and security and cannot be disabled. Analytical cookies (where used) help us understand aggregate usage and can be disabled through your browser settings; doing so may degrade certain features.</p>

        <h2><span className="num">13</span>Grievance Officer</h2>
        <p>In compliance with Section 8(9) of the DPDP Act, 2023, and Rule 5(9) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, the following officer has been designated to address grievances:</p>
        <table>
          <tbody>
            <tr><td><strong>Name</strong></td><td>Avon Kumar Sahni</td></tr>
            <tr><td><strong>Designation</strong></td><td>Grievance Officer, ProcureTrack</td></tr>
            <tr><td><strong>Email</strong></td><td><a href="mailto:admin@procuretrack.in">admin@procuretrack.in</a></td></tr>
            <tr><td><strong>Postal Address</strong></td><td>Ardee City, Gurugram, Haryana, India</td></tr>
            <tr><td><strong>Hours</strong></td><td>Monday to Friday, 10:00 to 18:00 IST (excluding public holidays)</td></tr>
          </tbody>
        </table>
        <p>We will acknowledge your grievance within 48 hours and aim to resolve it within 30 days of receipt.</p>

        <h2><span className="num">14</span>Children</h2>
        <p>The Service is not directed at, and we do not knowingly collect personal data from, individuals under 18 years of age. If we become aware that we have inadvertently collected such data, we will delete it without undue delay.</p>

        <h2><span className="num">15</span>Changes to This Policy</h2>
        <p>We may update this Policy from time to time. Material changes will be notified through the Service or by email at least 7 days before they take effect. Continued use of the Service after the effective date constitutes acceptance of the updated Policy.</p>

        <h2><span className="num">16</span>Contact</h2>
        <p>For any questions about this Policy or our data practices, write to:<br />
        <strong>Email:</strong> <a href="mailto:admin@procuretrack.in">admin@procuretrack.in</a><br />
        <strong>Address:</strong> Ardee City, Gurugram, Haryana, India</p>

        <footer>
          © 2026 ProcureTrack. All rights reserved. This Policy is governed by the laws of India.
          &nbsp;·&nbsp; <a href="/terms">Terms of Use</a> &nbsp;·&nbsp; <a href="/">Home</a>
        </footer>
      </div>
    </div>
  );
}

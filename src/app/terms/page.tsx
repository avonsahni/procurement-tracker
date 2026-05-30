import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Use — ProcureTrack',
  description: 'The binding terms that govern your use of the ProcureTrack procurement management platform.',
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
  .callout {
    background: var(--bg-card);
    border: 1px solid var(--rule);
    border-left: 3px solid var(--accent);
    padding: 18px 22px;
    margin: 24px 0;
    font-size: 15.5px;
  }
  .callout strong { display: block; margin-bottom: 6px; font-family: "Helvetica Neue", Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.08em; font-size: 12px; color: var(--accent); }
  .uppercase-block {
    font-family: "Helvetica Neue", Arial, sans-serif;
    text-transform: uppercase;
    font-size: 14px;
    letter-spacing: 0.04em;
    font-weight: 600;
    margin: 0 0 14px;
  }
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

export default function TermsPage() {
  return (
    <div className="legal-page">
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="legal-topbar">
        <a href="/">← Back to ProcureTrack</a>
        &nbsp;&nbsp;·&nbsp;&nbsp;
        <a href="/privacy">Privacy Policy</a>
      </div>

      <div className="wrap">
        <header>
          <div className="eyebrow">Legal · ProcureTrack</div>
          <h1>Terms of Use</h1>
          <div className="meta">Effective Date: 30 May 2026 &nbsp;·&nbsp; Last Updated: 30 May 2026</div>
        </header>

        <p className="lead">These Terms of Use form a binding contract between you and ProcureTrack. Please read them carefully. By creating an account or otherwise using the Service, you agree to be bound by these Terms. If you do not agree, you must not use the Service.</p>

        <h2><span className="num">01</span>Parties &amp; Definitions</h2>
        <p>These Terms are entered into between ProcureTrack ("ProcureTrack", "we", "us", "our"), currently operated by <strong>Avon Kumar Sahni, sole proprietor</strong>, with operations to be transferred to a Private Limited company upon its incorporation, and you, the user ("you", "your", "User"). The transferee entity will assume all rights and obligations under these Terms upon incorporation, without diminishing any user right.</p>
        <p>"Service" means the ProcureTrack web application and any related features, APIs, and documentation. "Customer" means the organisation that subscribes to the Service; "Authorised User" means an individual permitted by the Customer to access the Service. "Content" means any data, document, text, or material uploaded to or generated by the Service.</p>

        <h2><span className="num">02</span>Acceptance &amp; Electronic Contract</h2>
        <p>These Terms, together with the Privacy Policy, constitute an electronic record under the Information Technology Act, 2000, and the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021. They do not require any physical or digital signature and are legally enforceable under the Indian Contract Act, 1872.</p>

        <h2><span className="num">03</span>Eligibility</h2>
        <p>You may use the Service only if you are at least 18 years old and competent to contract under Section 11 of the Indian Contract Act, 1872. By using the Service on behalf of an organisation, you represent that you have the authority to bind that organisation to these Terms.</p>

        <h2><span className="num">04</span>Account Registration &amp; Security</h2>
        <ol>
          <li>You must provide accurate, complete, and current information during registration and keep it updated.</li>
          <li>You are responsible for all activity that occurs under your account, including activity by Authorised Users you create.</li>
          <li>You must keep your credentials confidential and notify us immediately at <a href="mailto:admin@procuretrack.in">admin@procuretrack.in</a> on any suspected unauthorised access.</li>
          <li>We may suspend or terminate accounts that are inactive, abandoned, or used in breach of these Terms.</li>
        </ol>

        <h2><span className="num">05</span>Subscription, Fees &amp; Taxes</h2>
        <ol>
          <li>Access to paid features is subject to payment of subscription fees published on our website or specified in your order.</li>
          <li>Fees are exclusive of applicable taxes including Goods and Services Tax (GST), which will be charged at the prevailing rate and itemised on your invoice.</li>
          <li>Subscriptions renew automatically at the end of each billing cycle unless cancelled at least 7 days before renewal.</li>
          <li>Payments are processed by our payment partners (Razorpay and PayU). Their terms apply to the payment transaction.</li>
          <li>Where required by law we will issue GST-compliant tax invoices. You are responsible for ensuring the accuracy of your GSTIN and billing details.</li>
        </ol>

        <h2><span className="num">06</span>Free Trial</h2>
        <p>New organisations receive a 14-day free trial of the Service. At the end of the trial period, if no paid subscription has been activated, the account and <strong>all associated data — including projects, packages, documents, and uploaded files — will be permanently and irrecoverably deleted</strong>. We will notify you by email before trial expiry. You are solely responsible for exporting any data you wish to retain before the trial ends.</p>

        <h2><span className="num">07</span>Refunds &amp; Cancellation</h2>
        <p>Subscription fees, once paid, are non-refundable except where (i) we materially fail to deliver the Service and cannot remedy the failure within 30 days of written notice, or (ii) a refund is required under applicable law. Cancellation takes effect at the end of the current billing cycle; you retain access until that date.</p>

        <h2><span className="num">08</span>Acceptable Use</h2>
        <p>You agree not to, and shall not permit any Authorised User to:</p>
        <ul>
          <li>Use the Service for any unlawful purpose or in violation of any applicable law including the Information Technology Act, 2000, the Bharatiya Nyaya Sanhita, 2023, GST law, and the DPDP Act, 2023.</li>
          <li>Upload Content that is defamatory, obscene, infringing, harmful, or that violates any third-party right.</li>
          <li>Reverse engineer, decompile, or attempt to derive the source code of the Service except to the extent permitted by law.</li>
          <li>Probe, scan, or test the vulnerability of the Service or breach its security or authentication measures.</li>
          <li>Use the Service to build a competing product or to benchmark its performance for publication without our written consent.</li>
          <li>Use automated means (bots, scrapers, crawlers) to access the Service except via our published APIs.</li>
          <li>Upload viruses, malware, or any code designed to disrupt or damage the Service.</li>
          <li>Resell, sublicense, or otherwise commercialise the Service without our written consent.</li>
        </ul>
        <p>We may, at our discretion, suspend or terminate access for breach of this section, with or without notice depending on the severity of the breach.</p>

        <h2><span className="num">09</span>Intellectual Property</h2>
        <h3>9.1 Our Rights</h3>
        <p>The Service, its underlying software, design, trademarks, logos, and all related intellectual property are owned by ProcureTrack or its licensors and are protected under the Copyright Act, 1957, the Trade Marks Act, 1999, the Patents Act, 1970, and applicable international treaties. Nothing in these Terms transfers any such intellectual property to you.</p>
        <p>Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, revocable licence to access and use the Service for your internal business purposes.</p>

        <h3>9.2 Your Content</h3>
        <p>You retain all rights in the Content you upload to the Service. You grant us a limited, worldwide, royalty-free licence to host, process, transmit, and display your Content solely to provide the Service to you and your Authorised Users, to provide support, and to comply with law.</p>

        <h3>9.3 Feedback</h3>
        <p>If you provide suggestions or feedback about the Service, we may use that feedback without obligation or compensation to you.</p>

        <h2><span className="num">10</span>AI-Assisted Features</h2>
        <p>The Service may, in future, offer AI-assisted features powered by third-party large language model providers (such as Anthropic&apos;s Claude API). Where such features are made available:</p>
        <ul>
          <li>You must explicitly opt in before any of your Content is transmitted to the AI provider.</li>
          <li>AI-generated outputs are probabilistic and may contain inaccuracies. You must independently verify any AI output before relying on it for procurement, contractual, or financial decisions.</li>
          <li>We make no warranty as to the accuracy, completeness, or fitness for purpose of AI outputs, and we are not liable for decisions made on their basis.</li>
        </ul>

        <h2><span className="num">11</span>Third-Party Services</h2>
        <p>The Service relies on or integrates with third-party services including payment gateways (Razorpay, PayU), Google services, Supabase, Vercel, and cloud infrastructure providers. Their terms and policies apply to the portions of the Service they provide. We are not responsible for the acts, omissions, or failures of these third parties beyond what is required of us under applicable law.</p>

        <h2><span className="num">12</span>Service Availability</h2>
        <p>We will use commercially reasonable efforts to maintain the availability of the Service. The Service is provided on an "as available" basis. We may from time to time carry out maintenance, updates, or modifications; where reasonably practicable, advance notice will be given. We do not guarantee uninterrupted, error-free, or completely secure operation of the Service unless a specific service level is agreed separately in writing.</p>

        <h2><span className="num">13</span>Disclaimers</h2>
        <p className="uppercase-block">To the maximum extent permitted by applicable law, the Service is provided "as is" and "as available", without warranties of any kind, whether express, implied, statutory, or otherwise. We disclaim all implied warranties including those of merchantability, fitness for a particular purpose, accuracy, and non-infringement.</p>
        <p>The Service is a tool to assist procurement workflows. It is not a substitute for professional judgement. You are solely responsible for the business decisions you make using the Service.</p>

        <h2><span className="num">14</span>Limitation of Liability</h2>
        <p className="uppercase-block">To the maximum extent permitted by law, our aggregate liability arising out of or in connection with these Terms or the Service — whether in contract, tort, statute, or otherwise — shall not exceed the total fees actually paid by you to us in the 12 months preceding the event giving rise to the claim, or INR 10,000, whichever is higher.</p>
        <p className="uppercase-block">In no event shall we be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, including loss of profits, revenue, data, goodwill, or business opportunity, even if advised of the possibility of such damages.</p>
        <p>Nothing in these Terms limits liability that cannot be limited under applicable law, including liability for fraud or wilful misconduct.</p>

        <h2><span className="num">15</span>Indemnity</h2>
        <p>You agree to indemnify, defend, and hold harmless ProcureTrack, its proprietor, successor entity, directors, employees, and agents from and against any claims, losses, damages, liabilities, costs, and expenses (including reasonable legal fees) arising out of (i) your breach of these Terms, (ii) your Content, (iii) your violation of any law, or (iv) your infringement of any third-party right through your use of the Service.</p>

        <h2><span className="num">16</span>Suspension &amp; Termination</h2>
        <ol>
          <li>You may terminate your account at any time by following the in-app cancellation flow or by writing to us.</li>
          <li>We may suspend or terminate your access (a) for non-payment, (b) for material breach of these Terms, (c) where required by law or regulatory direction, or (d) where we reasonably believe continued provision of the Service poses a risk to security, integrity, or other users.</li>
          <li>On termination, your right to use the Service ceases immediately. We will, on written request made within 30 days of termination, make a one-time export of your Content available in a commonly used machine-readable format. After 90 days from termination, we may permanently delete your Content, subject to Section 8 of the Privacy Policy.</li>
          <li>Sections that by their nature should survive termination — including IP, disclaimers, limitation of liability, indemnity, and governing law — will survive.</li>
        </ol>

        <h2><span className="num">17</span>Force Majeure</h2>
        <p>We are not liable for failure or delay in performance caused by events beyond our reasonable control, including acts of God, natural disasters, epidemics or pandemics, war, civil unrest, government action, internet or telecommunications failures, or cyber attacks on third-party infrastructure.</p>

        <h2><span className="num">18</span>Changes to These Terms</h2>
        <p>We may update these Terms from time to time. Material changes will be notified through the Service or by email at least 7 days before they take effect. Continued use of the Service after the effective date constitutes acceptance.</p>

        <h2><span className="num">19</span>Governing Law &amp; Dispute Resolution</h2>
        <p>These Terms are governed by, and construed in accordance with, the laws of India.</p>
        <p>Any dispute, controversy, or claim arising out of or in connection with these Terms or the Service shall first be attempted to be resolved by good-faith discussion between the parties within 30 days of written notice. If unresolved, the dispute shall be finally settled by arbitration under the Arbitration and Conciliation Act, 1996, by a sole arbitrator appointed by mutual agreement. The seat and venue of arbitration shall be <strong>Gurugram, Haryana</strong>. The language of arbitration shall be English. Subject to the arbitration provision, the courts at <strong>Gurugram, Haryana</strong> shall have exclusive jurisdiction.</p>

        <h2><span className="num">20</span>Notices</h2>
        <p>Notices to us must be sent in writing to <a href="mailto:admin@procuretrack.in">admin@procuretrack.in</a> with a copy to Ardee City, Gurugram, Haryana, India. Notices to you may be sent to the email address associated with your account; such notices are deemed received on the day of sending.</p>

        <h2><span className="num">21</span>Grievance Officer</h2>
        <p>In compliance with Rule 5(9) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, the Grievance Officer designated in Section 13 of the Privacy Policy also serves as the contact point for grievances under these Terms.</p>

        <h2><span className="num">22</span>Miscellaneous</h2>
        <ol>
          <li><strong>Entire agreement.</strong> These Terms and the Privacy Policy constitute the entire agreement between you and us regarding the Service and supersede any prior understanding.</li>
          <li><strong>Severability.</strong> If any provision is held invalid or unenforceable, the remaining provisions remain in full effect.</li>
          <li><strong>No waiver.</strong> Failure to enforce any provision is not a waiver of it.</li>
          <li><strong>Assignment.</strong> You may not assign these Terms without our written consent. We may assign these Terms to a successor entity (including the proposed Private Limited company) or in connection with a merger, acquisition, or sale of assets, on notice to you.</li>
          <li><strong>No agency.</strong> Nothing in these Terms creates any partnership, joint venture, agency, or employment relationship between the parties.</li>
          <li><strong>Headings.</strong> Headings are for convenience only and do not affect interpretation.</li>
        </ol>

        <h2><span className="num">23</span>Contact</h2>
        <p>For questions about these Terms, write to:<br />
        <strong>Email:</strong> <a href="mailto:admin@procuretrack.in">admin@procuretrack.in</a><br />
        <strong>Address:</strong> Ardee City, Gurugram, Haryana, India</p>

        <footer>
          © 2026 ProcureTrack. All rights reserved. Governed by the laws of India.
          &nbsp;·&nbsp; <a href="/privacy">Privacy Policy</a> &nbsp;·&nbsp; <a href="/">Home</a>
        </footer>
      </div>
    </div>
  );
}

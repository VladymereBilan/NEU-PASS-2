export const metadata = {
  title: "Privacy Policy · NEU-Pass"
};

export default function PrivacyPolicyPage() {
  return (
    <main
      className="relative min-h-screen bg-[#040f0a] text-white"
      style={{
        backgroundImage:
          "linear-gradient(rgba(3, 15, 9, 0.9), rgba(3, 15, 9, 0.94)), url('/NEWERABG.jpg')",
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed"
      }}
    >
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
          New Era University · NEU-Pass
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-400">Last updated: October 3, 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-gray-300">
          <Section title="Overview">
            <p>
              NEU-Pass is a visitor management system operated for New Era University. It consists
              of a public web-based visitor registration and pass flow (accessed by scanning a QR
              code at a campus gate), and a guard mobile application used by university security
              personnel to review, approve, and check out visitors. This policy explains what
              information NEU-Pass collects, why, how it is stored and shared, and how long it is
              kept, in compliance with the Data Privacy Act of 2012 (Republic Act No. 10173) of the
              Philippines.
            </p>
          </Section>

          <Section title="Information We Collect">
            <p className="font-semibold text-white">From visitors, at registration:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Full name, address, ID type, and ID number</li>
              <li>A photo of a valid government or school ID</li>
              <li>A live face photo, captured at registration</li>
              <li>Purpose of visit and the building/gate being visited (Main, SOM, or PSB)</li>
              <li>Number of accompanying minors (headcount only — we do not collect names or any
                other identifying information about minors)</li>
            </ul>
            <p className="mt-3 font-semibold text-white">At checkout:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>A second, live face photo captured by the guard&apos;s device, used only to confirm
                the visitor&apos;s identity against their registration photo</li>
            </ul>
            <p className="mt-3 font-semibold text-white">From guards and administrators:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>A username and password, used to sign in to the guard app or admin dashboard</li>
              <li>An optional recovery email address, used only for account password resets and
                monthly archive notifications</li>
            </ul>
          </Section>

          <Section title="How We Use This Information">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>To verify a visitor&apos;s identity and issue a time-limited digital gate pass</li>
              <li>To pre-fill registration fields by reading the uploaded ID photo (the visitor
                always reviews and confirms or corrects this before continuing — it is never used
                without their confirmation)</li>
              <li>To let a guard compare a visitor&apos;s ID and face photos at approval, and compare a
                fresh checkout photo against the registration photo to confirm the same person is
                leaving who checked in</li>
              <li>For campus security and an auditable record of who was on campus, when, and why</li>
            </ul>
          </Section>

          <Section title="Third-Party Processing">
            <p>
              NEU-Pass uses the following third-party service providers to operate. Each only
              receives the minimum data needed to perform its specific function:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <span className="font-semibold text-white">Amazon Web Services (Textract)</span> —
                reads text from an uploaded ID photo to suggest registration field values.
              </li>
              <li>
                <span className="font-semibold text-white">Amazon Web Services (Rekognition)</span>{" "}
                — compares a checkout face photo against the registration face photo to produce a
                similarity score.
              </li>
              <li>
                <span className="font-semibold text-white">Supabase</span> — hosts our database,
                file storage (ID/face photos), and authentication. Photos are stored privately and
                are never publicly accessible; guards and admins can only view them through
                short-lived, signed links.
              </li>
              <li>
                <span className="font-semibold text-white">Resend</span> — sends transactional
                emails only (password reset links, monthly data-archive notifications to
                administrators).
              </li>
              <li>
                <span className="font-semibold text-white">Vercel</span> — hosts the NEU-Pass
                website.
              </li>
            </ul>
            <p className="mt-3">
              We do not sell visitor data, and we do not use it for advertising or marketing.
            </p>
          </Section>

          <Section title="Data Retention">
            <p>
              Completed or rejected visitor registrations — including their ID and face photos —
              are retained only until the start of the following calendar month, at which point
              they are automatically archived (a CSV summary emailed to administrators) and then
              permanently deleted, both the database record and the stored photos. Active or
              pending registrations are retained only for the duration of the visit.
            </p>
          </Section>

          <Section title="Your Rights">
            <p>
              Under the Data Privacy Act of 2012, you may request access to, correction of, or
              deletion of your personal data held by NEU-Pass, and you may withdraw consent at any
              time (though doing so before a visit means the visitor must instead register manually
              with the guard on duty, as NEU-Pass requires consent to operate the web registration
              flow). To exercise any of these rights, contact us using the details below.
            </p>
          </Section>

          <Section title="Security">
            <p>
              All data is transmitted over encrypted connections (HTTPS). Access to visitor data is
              restricted by role: visitors can only see their own registration and pass, guards can
              review and act on any registration during their shift, and administrators can view
              aggregate reports and manage accounts. No visitor ID or face photo is ever made
              publicly accessible.
            </p>
          </Section>

          <Section title="Contact Us">
            <p>
              For any privacy-related question or request, contact us at{" "}
              <a href="mailto:dimmybilan@gmail.com" className="text-emerald-400 underline">
                dimmybilan@gmail.com
              </a>
              .
            </p>
          </Section>
        </div>

        <div className="mt-16 text-center text-xs text-gray-500">
          © 2026 New Era University · NEU-Pass · All rights reserved
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}

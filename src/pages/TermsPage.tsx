import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl sm:text-3xl">
            Terms of Service
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </CardHeader>
        <CardContent className="prose prose-sm sm:prose max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">
              1. Acceptance of Terms
            </h2>
            <p className="text-muted-foreground">
              By accessing and using MadeWithKiro, you accept and agree to be
              bound by these Terms of Service. If you do not agree to these
              terms, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              2. Description of Service
            </h2>
            <p className="text-muted-foreground">
              MadeWithKiro is a showcase platform where users can display
              applications they've built using Kiro. The service allows users to
              create profiles, share their work, and connect with the community.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
            <p className="text-muted-foreground">
              You are responsible for maintaining the confidentiality of your
              account credentials. You agree to accept responsibility for all
              activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. User Content</h2>
            <p className="text-muted-foreground">
              You retain all rights to the content you post on MadeWithKiro. By
              posting content, you grant us a non-exclusive license to display
              and distribute your content on the platform. You are responsible
              for ensuring you have the right to share any content you post.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              5. Prohibited Conduct
            </h2>
            <p className="text-muted-foreground mb-2">You agree not to:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Post false, misleading, or fraudulent content</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on intellectual property rights of others</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Attempt to gain unauthorized access to the service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Disclaimer</h2>
            <p className="text-muted-foreground">
              MadeWithKiro is provided "as is" without warranties of any kind.
              We do not guarantee the accuracy, completeness, or reliability of
              any content on the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              7. Limitation of Liability
            </h2>
            <p className="text-muted-foreground">
              We shall not be liable for any indirect, incidental, special, or
              consequential damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these terms at any time. Continued
              use of the service after changes constitutes acceptance of the new
              terms.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

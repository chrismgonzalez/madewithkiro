import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPage() {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl sm:text-3xl">Privacy Policy</CardTitle>
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </CardHeader>
        <CardContent className="prose prose-sm sm:prose max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">
              1. Information We Collect
            </h2>
            <p className="text-muted-foreground mb-2">
              We collect information you provide directly to us:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Name and email address (from OAuth providers)</li>
              <li>Profile information (social media handles)</li>
              <li>Application information you create</li>
              <li>Profile picture (from OAuth providers)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              2. How We Use Your Information
            </h2>
            <p className="text-muted-foreground mb-2">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Provide, maintain, and improve our services</li>
              <li>Create and manage your account</li>
              <li>Display your profile and applications to other users</li>
              <li>Communicate with you about the service</li>
              <li>Ensure security and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              3. Information Sharing
            </h2>
            <p className="text-muted-foreground">
              Your profile information (First Name, Last Name, Github, AWS Builder Center, and LinkedIn) and applications are publicly visible on
              MadeWithKiro. We do not sell your personal information to third
              parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Authentication</h2>
            <p className="text-muted-foreground">
              We use AWS Cognito for authentication with Google and GitHub OAuth
              providers. When you sign in, we receive basic profile information including your First Name, Last Name and Email
              from these providers according to their privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Data Storage</h2>
            <p className="text-muted-foreground">
              Your data is stored securely using AWS services. We implement industry-standard security measures to
              protect your information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Your Rights</h2>
            <p className="text-muted-foreground mb-2">You have the right to:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Access your personal information</li>
              <li>Update or correct your information</li>
              <li>Delete your account and associated data</li>
              <li>Control what information is publicly visible</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              7. Cookies and Tracking
            </h2>
            <p className="text-muted-foreground">
              We use authentication tokens to maintain your session. We do not
              use third-party tracking or advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              8. Children's Privacy
            </h2>
            <p className="text-muted-foreground">
              MadeWithKiro is not intended for users under 13 years of age. We
              do not knowingly collect information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              9. Changes to Privacy Policy
            </h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will
              notify users of any material changes by posting the new policy on
              this page.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

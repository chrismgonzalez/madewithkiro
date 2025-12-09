/**
 * Debug component to inspect auth attributes
 * Temporary component for debugging account linking
 */

import { useEffect, useState } from "react";
import { fetchUserAttributes, fetchAuthSession } from "aws-amplify/auth";
import { useAuth } from "@/contexts/AuthContext";

export function DebugAuth() {
  const { user, pendingLink, linkTargetSub } = useAuth();
  const [attributes, setAttributes] = useState<Record<string, any>>({});
  const [tokenClaims, setTokenClaims] = useState<Record<string, any>>({});

  useEffect(() => {
    const loadAttributes = async () => {
      try {
        const attrs = await fetchUserAttributes();
        setAttributes(attrs);

        // Also get the ID token and decode it
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken;
        if (idToken) {
          // Decode JWT payload (it's base64 encoded)
          const payload = idToken.payload;
          setTokenClaims(payload);
          console.log("🔍 User Attributes:", attrs);
          console.log("🎫 ID Token Claims:", payload);
          console.log("🔗 Pending Link:", pendingLink);
          console.log("🎯 Link Target Sub:", linkTargetSub);
        }
      } catch (error) {
        console.error("Failed to fetch attributes:", error);
      }
    };

    if (user) {
      loadAttributes();
    }
  }, [user, pendingLink, linkTargetSub]);

  if (!user) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs max-w-md max-h-96 overflow-auto z-50">
      <h3 className="font-bold mb-2">🐛 Auth Debug</h3>
      <div className="space-y-1">
        <div>
          <strong>User ID:</strong> {user.userId}
        </div>
        <div>
          <strong>Email:</strong> {user.email}
        </div>
        <div>
          <strong>Provider:</strong> {user.provider}
        </div>
        <div>
          <strong>Pending Link:</strong> {String(pendingLink)}
        </div>
        <div>
          <strong>Link Target:</strong> {linkTargetSub || "none"}
        </div>
        <hr className="my-2 border-gray-600" />
        <div>
          <strong>User Attributes:</strong>
        </div>
        <pre className="text-[10px] overflow-auto max-h-32">
          {JSON.stringify(attributes, null, 2)}
        </pre>
        <hr className="my-2 border-gray-600" />
        <div>
          <strong>ID Token Claims:</strong>
        </div>
        <pre className="text-[10px] overflow-auto max-h-32">
          {JSON.stringify(tokenClaims, null, 2)}
        </pre>
      </div>
    </div>
  );
}

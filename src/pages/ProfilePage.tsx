import ProfileView from "@/components/ProfileView";

interface ProfilePageProps {
  userId: string;
}

export default function ProfilePage({ userId }: ProfilePageProps) {
  return (
    <div>
      <ProfileView userId={userId} />
    </div>
  );
}

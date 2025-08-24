"use client";
export const dynamic = "force-dynamic";

import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { HackathonForm } from "@/components/features/hackathon";

export default function CreateHackathonPage() {
  const router = useRouter();

  const handleSuccess = (hackathon: { id: string }) => {
    // Redirect to the newly created hackathon page
    router.push(`/hackathons/${hackathon.id}`);
  };

  const handleCancel = () => {
    // Go back to hackathons list
    router.push("/hackathons");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container px-4 py-8 mx-auto">
        <HackathonForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  );
}

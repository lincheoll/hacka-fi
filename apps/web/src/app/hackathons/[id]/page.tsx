import { Metadata } from "next";
import { Header } from "@/components/layout/header";

interface HackathonDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: HackathonDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Hackathon ${id} | Hacka-Fi`,
    description: `View details for hackathon ${id}`,
  };
}

export default async function HackathonDetailPage({
  params,
}: HackathonDetailPageProps) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Hackathon {id}</h1>
        <p className="text-gray-600">Hackathon details will be displayed here.</p>
      </div>
    </div>
  );
}

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hackathons | Hacka-Fi',
  description: 'Discover and participate in blockchain hackathons',
};

export default function HackathonsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Hackathons</h1>
      <p className="text-gray-600">Hackathons list will be displayed here.</p>
    </div>
  );
}
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Hackathon | Hacka-Fi',
  description: 'Create a new blockchain hackathon',
};

export default function CreateHackathonPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Create Hackathon</h1>
      <p className="text-gray-600">Hackathon creation form will be displayed here.</p>
    </div>
  );
}
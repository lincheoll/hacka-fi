import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Profile | Hacka-Fi',
  description: 'View and edit your profile',
};

export default function MyProfilePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>
      <p className="text-gray-600">Your profile details will be displayed here.</p>
    </div>
  );
}
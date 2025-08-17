'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Header } from '@/components/layout/header';
import { fetchUserParticipations, fetchUserHackathons } from '@/lib/api-functions';
import type { Participant, Hackathon } from '@/types/global';

export default function DashboardPage() {
  const { address: walletAddress, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch user participations
  const { 
    data: participations, 
    isLoading: isLoadingParticipations, 
    error: participationsError 
  } = useQuery({
    queryKey: ['user-participations', walletAddress],
    queryFn: () => walletAddress ? fetchUserParticipations(walletAddress) : [],
    enabled: !!walletAddress && isConnected && mounted,
  });

  // Fetch user created hackathons
  const { 
    data: createdHackathons, 
    isLoading: isLoadingHackathons, 
    error: hackathonsError 
  } = useQuery({
    queryKey: ['user-hackathons', walletAddress],
    queryFn: () => walletAddress ? fetchUserHackathons(walletAddress) : [],
    enabled: !!walletAddress && isConnected && mounted,
  });

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Dashboard</h1>
          <Alert>
            <AlertDescription>
              Please connect your wallet to view your dashboard.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REGISTRATION_OPEN':
        return 'bg-green-100 text-green-800';
      case 'SUBMISSION_OPEN':
        return 'bg-blue-100 text-blue-800';
      case 'VOTING_OPEN':
        return 'bg-purple-100 text-purple-800';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your hackathon participations and submissions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Participations Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                My Participations
              </h2>
              <Button asChild variant="outline" size="sm">
                <Link href="/hackathons">Find Hackathons</Link>
              </Button>
            </div>

            {isLoadingParticipations ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-32 bg-gray-200 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : participationsError ? (
              <Alert className="border-red-500 bg-red-50">
                <AlertDescription className="text-red-700">
                  Failed to load participations. Please try again.
                </AlertDescription>
              </Alert>
            ) : !participations || participations.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-gray-500 mb-4">No hackathon participations yet</p>
                  <Button asChild>
                    <Link href="/hackathons">Join Your First Hackathon</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {participations.map((participation) => (
                  <Card key={participation.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            <Link 
                              href={`/hackathons/${participation.hackathonId}`}
                              className="hover:text-blue-600"
                            >
                              {/* We'll need to fetch hackathon details or include them in the API response */}
                              Hackathon #{participation.hackathonId}
                            </Link>
                          </CardTitle>
                          <CardDescription>
                            Registered on {new Date(participation.registeredAt).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <Badge variant="outline">
                          Participant
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Submission Status:</span>
                          <span className={participation.submissionUrl ? 'text-green-600' : 'text-gray-500'}>
                            {participation.submissionUrl ? 'Submitted' : 'Not Submitted'}
                          </span>
                        </div>
                        {participation.submissionUrl && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Project URL:</span>
                            <a 
                              href={participation.submissionUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline max-w-xs truncate"
                            >
                              {participation.submissionUrl}
                            </a>
                          </div>
                        )}
                        <div className="flex gap-2 mt-3">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/hackathons/${participation.hackathonId}`}>
                              View Details
                            </Link>
                          </Button>
                          {!participation.submissionUrl && (
                            <Button asChild size="sm">
                              <Link href={`/hackathons/${participation.hackathonId}#submit`}>
                                Submit Project
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Created Hackathons Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                My Hackathons
              </h2>
              <Button asChild variant="outline" size="sm">
                <Link href="/hackathons/create">Create Hackathon</Link>
              </Button>
            </div>

            {isLoadingHackathons ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-32 bg-gray-200 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : hackathonsError ? (
              <Alert className="border-red-500 bg-red-50">
                <AlertDescription className="text-red-700">
                  Failed to load created hackathons. Please try again.
                </AlertDescription>
              </Alert>
            ) : !createdHackathons || createdHackathons.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-gray-500 mb-4">No hackathons created yet</p>
                  <Button asChild>
                    <Link href="/hackathons/create">Create Your First Hackathon</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {createdHackathons.map((hackathon) => (
                  <Card key={hackathon.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            <Link 
                              href={`/hackathons/${hackathon.id}`}
                              className="hover:text-blue-600"
                            >
                              {hackathon.title}
                            </Link>
                          </CardTitle>
                          <CardDescription>
                            Created on {new Date(hackathon.createdAt).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(hackathon.status)}>
                          {formatStatus(hackathon.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Registration Deadline:</span>
                          <span>{new Date(hackathon.registrationDeadline).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Submission Deadline:</span>
                          <span>{new Date(hackathon.submissionDeadline).toLocaleDateString()}</span>
                        </div>
                        {hackathon.prizeAmount && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Prize Amount:</span>
                            <span className="font-medium">{hackathon.prizeAmount} KAIA</span>
                          </div>
                        )}
                        <div className="flex gap-2 mt-3">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/hackathons/${hackathon.id}`}>
                              View Details
                            </Link>
                          </Button>
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/hackathons/${hackathon.id}/edit`}>
                              Edit
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {participations?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Hackathons Joined</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-green-600">
                {participations?.filter(p => p.submissionUrl).length || 0}
              </div>
              <div className="text-sm text-gray-600">Projects Submitted</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {createdHackathons?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Hackathons Created</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Search, Filter, SortAsc, SortDesc } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fetchHackathons } from '@/lib/api-functions';
import { HackathonCoverImage } from '@/components/common/optimized-image';
import type { Hackathon } from '@/types/global';

interface HackathonListProps {
  initialHackathons?: Hackathon[];
}

type SortOption = 'newest' | 'oldest' | 'deadline_asc' | 'deadline_desc' | 'prize_desc' | 'prize_asc';
type StatusFilter = 'all' | 'registration_open' | 'submission_open' | 'voting_open' | 'completed';

export function HackathonList({ initialHackathons }: HackathonListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Fetch hackathons
  const { 
    data: hackathonsResponse, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['hackathons', { status: statusFilter !== 'all' ? statusFilter : undefined }],
    queryFn: () => fetchHackathons({ 
      status: statusFilter !== 'all' ? statusFilter.toUpperCase() : undefined,
      page: 1,
      limit: 100 // Get all for client-side filtering
    }),
    initialData: initialHackathons ? { 
      data: initialHackathons, 
      pagination: { page: 1, limit: 100, total: initialHackathons.length, totalPages: 1 }
    } : undefined,
  });

  // Filter and sort hackathons
  const filteredAndSortedHackathons = useMemo(() => {
    const hackathons = hackathonsResponse?.data || [];
    let filtered = hackathons;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(hackathon => 
        hackathon.title.toLowerCase().includes(query) ||
        hackathon.description.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'deadline_asc':
          return new Date(a.submissionDeadline).getTime() - new Date(b.submissionDeadline).getTime();
        case 'deadline_desc':
          return new Date(b.submissionDeadline).getTime() - new Date(a.submissionDeadline).getTime();
        case 'prize_desc':
          const prizeA = a.prizeAmount ? parseFloat(a.prizeAmount) : 0;
          const prizeB = b.prizeAmount ? parseFloat(b.prizeAmount) : 0;
          return prizeB - prizeA;
        case 'prize_asc':
          const prizeA2 = a.prizeAmount ? parseFloat(a.prizeAmount) : 0;
          const prizeB2 = b.prizeAmount ? parseFloat(b.prizeAmount) : 0;
          return prizeA2 - prizeB2;
        default:
          return 0;
      }
    });

    return filtered;
  }, [hackathonsResponse?.data, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedHackathons.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedHackathons = filteredAndSortedHackathons.slice(startIndex, startIndex + itemsPerPage);

  // Reset to first page when filters change
  const handleFilterChange = (newFilter: StatusFilter) => {
    setStatusFilter(newFilter);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    setCurrentPage(1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REGISTRATION_OPEN':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'SUBMISSION_OPEN':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'VOTING_OPEN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const getTimeRemaining = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - now.getTime();
    
    if (diffTime <= 0) {
      return 'Ended';
    }
    
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return '1 day left';
    } else if (diffDays < 7) {
      return `${diffDays} days left`;
    } else {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} left`;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-500 bg-red-50">
        <AlertDescription className="text-red-700">
          Failed to load hackathons. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search hackathons..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-wrap gap-3">
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="registration_open">Registration Open</SelectItem>
              <SelectItem value="submission_open">Submission Open</SelectItem>
              <SelectItem value="voting_open">Voting Open</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-48">
              {sortBy.includes('desc') ? (
                <SortDesc className="h-4 w-4 mr-2" />
              ) : (
                <SortAsc className="h-4 w-4 mr-2" />
              )}
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="deadline_asc">Deadline (Soon)</SelectItem>
              <SelectItem value="deadline_desc">Deadline (Later)</SelectItem>
              <SelectItem value="prize_desc">Prize (Highest)</SelectItem>
              <SelectItem value="prize_asc">Prize (Lowest)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        {filteredAndSortedHackathons.length} hackathon{filteredAndSortedHackathons.length !== 1 ? 's' : ''} found
        {searchQuery && (
          <span> for &ldquo;{searchQuery}&rdquo;</span>
        )}
      </div>

      {/* Hackathon Grid */}
      {paginatedHackathons.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No hackathons found matching your criteria.</p>
          <Button asChild>
            <Link href="/hackathons/create">Create the First Hackathon</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedHackathons.map((hackathon) => (
            <Card key={hackathon.id} className="hover:shadow-lg transition-shadow duration-200 overflow-hidden">
              {/* Cover Image */}
              <div className="aspect-[2/1] relative overflow-hidden">
                <HackathonCoverImage
                  src={hackathon.coverImageUrl}
                  alt={hackathon.title}
                  className="w-full h-full"
                />
                <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                  <Badge className={getStatusColor(hackathon.status)}>
                    {formatStatus(hackathon.status)}
                  </Badge>
                  <span className="text-sm text-white bg-black/50 px-2 py-1 rounded">
                    {getTimeRemaining(hackathon.submissionDeadline)}
                  </span>
                </div>
              </div>
              
              <CardHeader>
                <CardTitle className="line-clamp-2">
                  <Link 
                    href={`/hackathons/${hackathon.id}`}
                    className="hover:text-blue-600 transition-colors"
                  >
                    {hackathon.title}
                  </Link>
                </CardTitle>
                <CardDescription className="line-clamp-3">
                  {hackathon.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Prize and Entry Fee */}
                  <div className="flex items-center justify-between text-sm">
                    {hackathon.prizeAmount ? (
                      <div>
                        <span className="text-gray-600">Prize:</span>
                        <span className="font-semibold text-green-600 ml-1">
                          {hackathon.prizeAmount} KAIA
                        </span>
                      </div>
                    ) : (
                      <div className="text-gray-500">No prize pool</div>
                    )}
                    {hackathon.entryFee && (
                      <div>
                        <span className="text-gray-600">Entry:</span>
                        <span className="font-medium ml-1">{hackathon.entryFee} KAIA</span>
                      </div>
                    )}
                  </div>

                  {/* Deadlines */}
                  <div className="space-y-1 text-xs text-gray-600">
                    <div>Registration: {new Date(hackathon.registrationDeadline).toLocaleDateString()}</div>
                    <div>Submission: {new Date(hackathon.submissionDeadline).toLocaleDateString()}</div>
                  </div>

                  {/* Organizer */}
                  <div className="text-xs text-gray-500">
                    by {hackathon.organizerAddress.slice(0, 6)}...{hackathon.organizerAddress.slice(-4)}
                  </div>

                  {/* Action Button */}
                  <Button asChild className="w-full" variant="outline">
                    <Link href={`/hackathons/${hackathon.id}`}>
                      View Details
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          
          {/* Page Numbers */}
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className="w-10"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
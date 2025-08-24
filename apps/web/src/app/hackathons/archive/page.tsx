"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/header";
import {
  PublicHackathon,
  PaginatedResponse,
  PublicHackathonQuery,
} from "@/types/public-api";
import { publicApi } from "@/lib/public-api";
import { HackathonShowcase } from "@/components/features/winner/hackathon-showcase";
import {
  Search,
  Filter,
  Calendar,
  Users,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { OptimizedImage } from "@/components/common/optimized-image";
import Link from "next/link";

export default function HackathonArchivePage() {
  const [hackathons, setHackathons] =
    useState<PaginatedResponse<PublicHackathon> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState<
    "prizeAmount" | "participantCount" | "dateCreated"
  >("dateCreated");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [minPrize, setMinPrize] = useState("");
  const [maxPrize, setMaxPrize] = useState("");
  const [selectedHackathon, setSelectedHackathon] =
    useState<PublicHackathon | null>(null);

  const loadHackathons = async (query: PublicHackathonQuery) => {
    try {
      setLoading(true);
      const data = await publicApi.getHackathonArchive(query);
      setHackathons(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load hackathon archive",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const query: PublicHackathonQuery = {
      page: currentPage,
      limit: 12,
      filterBy,
      sortOrder,
      ...(searchTerm && { search: searchTerm }),
      ...(minPrize && { minPrizeAmount: parseFloat(minPrize) }),
      ...(maxPrize && { maxPrizeAmount: parseFloat(maxPrize) }),
    };
    loadHackathons(query);
  }, [currentPage, filterBy, sortOrder, searchTerm, minPrize, maxPrize]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    const query: PublicHackathonQuery = {
      page: 1,
      limit: 12,
      filterBy,
      sortOrder,
      ...(searchTerm && { search: searchTerm }),
      ...(minPrize && { minPrizeAmount: parseFloat(minPrize) }),
      ...(maxPrize && { maxPrizeAmount: parseFloat(maxPrize) }),
    };
    loadHackathons(query);
  };

  const formatPrizeAmount = (amount: string) => {
    const numAmount = parseFloat(amount);
    if (numAmount >= 1000000) {
      return `$${(numAmount / 1000000).toFixed(1)}M`;
    } else if (numAmount >= 1000) {
      return `$${(numAmount / 1000).toFixed(1)}K`;
    }
    return `$${numAmount.toLocaleString()}`;
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (selectedHackathon) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => setSelectedHackathon(null)}
              className="mb-4"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Archive
            </Button>
          </div>
          <HackathonShowcase
            hackathon={selectedHackathon}
            showAllWinners={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <Header />
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Hackathon Archive
          </h1>
          <p className="text-gray-600">
            Browse past hackathons and their winning projects
          </p>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search hackathons by title or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button type="submit" className="md:w-auto w-full">
                  Search
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="md:w-auto w-full"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
              </div>

              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Sort by
                    </label>
                    <Select
                      value={filterBy}
                      onValueChange={(
                        value:
                          | "prizeAmount"
                          | "participantCount"
                          | "dateCreated",
                      ) => setFilterBy(value)}
                    >
                      <option value="dateCreated">Date</option>
                      <option value="prizeAmount">Prize Amount</option>
                      <option value="participantCount">Participants</option>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Order
                    </label>
                    <Select
                      value={sortOrder}
                      onValueChange={(value: "asc" | "desc") =>
                        setSortOrder(value)
                      }
                    >
                      <option value="desc">Descending</option>
                      <option value="asc">Ascending</option>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Min Prize ($)
                    </label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={minPrize}
                      onChange={(e) => setMinPrize(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Max Prize ($)
                    </label>
                    <Input
                      type="number"
                      placeholder="100000"
                      value={maxPrize}
                      onChange={(e) => setMaxPrize(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-gray-200"></div>
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3 mb-4"></div>
                  <div className="flex justify-between">
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Retry
            </Button>
          </div>
        ) : hackathons && hackathons.data.length > 0 ? (
          <>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Showing {(currentPage - 1) * 12 + 1} to{" "}
                {Math.min(currentPage * 12, hackathons.total)} of{" "}
                {hackathons.total} hackathons
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hackathons.data.map((hackathon) => (
                <Card
                  key={hackathon.id}
                  className="hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                >
                  <div className="relative overflow-hidden">
                    {hackathon.coverImageUrl ? (
                      <OptimizedImage
                        src={hackathon.coverImageUrl}
                        alt={hackathon.title}
                        width={400}
                        height={192}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <div className="text-white text-center">
                          <h3 className="text-lg font-bold mb-1">
                            {hackathon.title}
                          </h3>
                          <p className="text-sm opacity-90">Hackathon</p>
                        </div>
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-800"
                      >
                        Completed
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-bold text-lg mb-1 line-clamp-1">
                          {hackathon.title}
                        </h3>
                        <p className="text-gray-600 text-sm line-clamp-2">
                          {hackathon.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {format(
                              new Date(hackathon.votingDeadline),
                              "MMM yyyy",
                            )}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4" />
                          <span>{hackathon.participantCount}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1 text-green-600 font-semibold">
                          <DollarSign className="w-4 h-4" />
                          <span>
                            {formatPrizeAmount(hackathon.prizeAmount)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {hackathon.winners.length} winners
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                        <span>
                          By {formatAddress(hackathon.organizerAddress)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedHackathon(hackathon)}
                          className="text-blue-600 hover:text-blue-800 p-0 h-auto"
                        >
                          View Details →
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {hackathons.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Page {currentPage} of {hackathons.totalPages}
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>

                  <div className="flex items-center space-x-1">
                    {[...Array(Math.min(5, hackathons.totalPages))].map(
                      (_, i) => {
                        const page = i + 1;
                        return (
                          <Button
                            key={page}
                            variant={
                              currentPage === page ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        );
                      },
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage >= hackathons.totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hackathons found
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || minPrize || maxPrize
                ? "Try adjusting your search criteria or filters"
                : "There are no completed hackathons to display yet"}
            </p>
            {(searchTerm || minPrize || maxPrize) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setMinPrize("");
                  setMaxPrize("");
                  setCurrentPage(1);
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Header } from "@/components/layout/header";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <Header />

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Blockchain Hackathons
            <br />
            <span className="text-blue-600">Reimagined</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Participate in decentralized hackathons with transparent voting and
            automated prize distribution on the Kaia blockchain.
          </p>

          <div className="flex gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/hackathons">Explore Hackathons</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/hackathons/create">Host a Hackathon</Link>
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                🏆
              </div>
              <CardTitle>Transparent Voting</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Fair and transparent judging system with on-chain vote recording
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                💰
              </div>
              <CardTitle>Automated Prizes</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Smart contract-powered automatic prize distribution to winners
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                ⚡
              </div>
              <CardTitle>Kaia Powered</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Built on Kaia blockchain for fast, secure, and cost-effective
                transactions
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import LatestAds from "@/components/landing/LatestAds";
import WhyUs from "@/components/landing/WhyUs";
import FooterCTA from "@/components/landing/FooterCTA";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      const dashboardPath =
        user.role === "PHARMACY"
          ? "/dashboard/pharmacy"
          : "/dashboard/substitute";
      router.replace(dashboardPath);
    }
  }, [user, loading, router]);

  // Show nothing while checking auth or redirecting
  if (loading || user) {
    return null;
  }

  return (
    <div className="landing-page">
      <Hero />
      <HowItWorks />
      <LatestAds />
      <WhyUs />
      <FooterCTA />
    </div>
  );
}

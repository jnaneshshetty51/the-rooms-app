"use client";

import { useEffect, useState } from "react";
import { Star, Loader2, Gift, TrendingUp, Award, Crown } from "lucide-react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Button,
    Badge,
} from "@the-rooms/ui";
import { formatDate, formatCurrency } from "@the-rooms/ui";

type PointsTransaction = {
    id: string;
    type: string;
    points: number;
    description: string;
    createdAt: string;
};

type TierBenefit = {
    name: string;
    type: string;
};

type LoyaltyData = {
    points: number;
    tier: string;
    tierDisplayName: string;
    pointsToNextTier: number;
    history: PointsTransaction[];
    benefits: TierBenefit[];
    programName: string;
};

const TIER_COLORS: Record<string, string> = {
    BRONZE: "bg-[#CD7F32]/10 text-[#CD7F32] border-[#CD7F32]/20",
    SILVER: "bg-[#C0C0C0]/10 text-[#808080] border-[#C0C0C0]/20",
    GOLD: "bg-[#FFD700]/10 text-[#B8860B] border-[#FFD700]/20",
    PLATINUM: "bg-[#E5E4E2]/10 text-[#585858] border-[#E5E4E2]/20",
};

const TIER_ICONS: Record<string, React.ReactNode> = {
    BRONZE: <Award className="w-5 h-5" />,
    SILVER: <Award className="w-5 h-5" />,
    GOLD: <Crown className="w-5 h-5" />,
    PLATINUM: <Crown className="w-5 h-5" />,
};

const POINTS_LABEL: Record<string, string> = {
    BRONZE: "5 pts / ₹100",
    SILVER: "7 pts / ₹100",
    GOLD: "10 pts / ₹100",
    PLATINUM: "15 pts / ₹100",
};

export default function LoyaltyPage() {
    const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchLoyalty() {
            try {
                const res = await fetch("/api/loyalty");
                if (res.ok) {
                    const data = await res.json();
                    setLoyalty(data);
                }
            } catch (err) {
                console.error("Error fetching loyalty:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchLoyalty();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-[#E17055] animate-spin" />
            </div>
        );
    }

    if (!loyalty) {
        return (
            <div className="text-center py-20">
                <Star className="w-12 h-12 text-[#B2BEC3] mx-auto mb-3" />
                <p className="text-[#636E72] font-medium">Loyalty program data unavailable</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[#2D3436]">My Rewards</h1>
                <p className="text-sm text-[#636E72] mt-1">{loyalty.programName}</p>
            </div>

            {/* Points Card */}
            <Card className="border-[#E17055]/30 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-[#E17055] to-[#FDCB6E]" />
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[#636E72]">Available Points</p>
                            <p className="text-4xl font-bold text-[#2D3436] mt-1">
                                {loyalty.points.toLocaleString()}
                            </p>
                        </div>
                        <div className="text-right">
                            <Badge className={TIER_COLORS[loyalty.tier] ?? TIER_COLORS.BRONZE}>
                                <span className="flex items-center gap-1">
                                    {TIER_ICONS[loyalty.tier]}
                                    {loyalty.tierDisplayName}
                                </span>
                            </Badge>
                            <p className="text-xs text-[#B2BEC3] mt-1">
                                Earning: {POINTS_LABEL[loyalty.tier]}
                            </p>
                        </div>
                    </div>

                    {loyalty.pointsToNextTier > 0 && (
                        <div className="mt-4 pt-4 border-t border-[#E5E5E5]">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-[#636E72]">
                                    {loyalty.pointsToNextTier.toLocaleString()} points to next tier
                                </span>
                                <span className="font-medium text-[#E17055]">
                                    {Math.round((loyalty.points / (loyalty.points + loyalty.pointsToNextTier)) * 100)}% complete
                                </span>
                            </div>
                            <div className="h-2 bg-[#F0F0F0] rounded-full mt-2 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-[#E17055] to-[#FDCB6E] rounded-full transition-all"
                                    style={{
                                        width: `${Math.round(
                                            (loyalty.points / (loyalty.points + loyalty.pointsToNextTier)) * 100
                                        )}%`,
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Tier Benefits */}
            <div>
                <h2 className="text-lg font-semibold text-[#2D3436] mb-3">Your Tier Benefits</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {loyalty.benefits.map((benefit, i) => (
                        <Card key={i} className="border-[#E5E5E5]">
                            <CardContent className="p-3 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#00B894]/10 flex items-center justify-center shrink-0">
                                    {benefit.type === "earning" ? (
                                        <TrendingUp className="w-4 h-4 text-[#00B894]" />
                                    ) : benefit.type === "discount" ? (
                                        <Gift className="w-4 h-4 text-[#00B894]" />
                                    ) : (
                                        <Star className="w-4 h-4 text-[#00B894]" />
                                    )}
                                </div>
                                <p className="text-sm text-[#636E72]">{benefit.name}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Points History */}
            <div>
                <h2 className="text-lg font-semibold text-[#2D3436] mb-3">Points History</h2>
                {loyalty.history.length === 0 ? (
                    <Card className="border-dashed border-2 border-[#E5E5E5]">
                        <CardContent className="py-10 text-center">
                            <Star className="w-10 h-10 text-[#B2BEC3] mx-auto mb-3" />
                            <p className="text-[#636E72] text-sm">No points history yet</p>
                            <p className="text-xs text-[#B2BEC3] mt-1">
                                Earn points by staying with us!
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {loyalty.history.map((tx) => (
                            <Card key={tx.id}>
                                <CardContent className="p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tx.type === "EARNED"
                                                ? "bg-[#00B894]/10"
                                                : tx.type === "REDEEMED"
                                                    ? "bg-[#E17055]/10"
                                                    : "bg-[#FDCB6E]/10"
                                                }`}
                                        >
                                            {tx.type === "EARNED" ? (
                                                <TrendingUp className="w-4 h-4 text-[#00B894]" />
                                            ) : tx.type === "REDEEMED" ? (
                                                <Gift className="w-4 h-4 text-[#E17055]" />
                                            ) : (
                                                <Star className="w-4 h-4 text-[#FDCB6E]" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-[#2D3436]">
                                                {tx.description || tx.type.replace("_", " ")}
                                            </p>
                                            <p className="text-xs text-[#B2BEC3]">
                                                {formatDate(tx.createdAt, "long")}
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className={`text-sm font-semibold ${tx.type === "EARNED" ? "text-[#00B894]" : "text-[#E17055]"
                                            }`}
                                    >
                                        {tx.type === "EARNED" ? "+" : "-"}{tx.points} pts
                                    </span>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
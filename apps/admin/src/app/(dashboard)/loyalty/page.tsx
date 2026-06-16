"use client";

// apps/admin/src/app/(dashboard)/loyalty/page.tsx
import { useEffect, useState } from "react";
import { Award, Star, Gift, TrendingUp } from "lucide-react";
import { PageHeader, Card, CardContent, CardHeader, CardTitle, Badge, StatCard } from "@the-rooms/ui";
import { formatCurrency, formatDate } from "@the-rooms/ui";
import { fetchLoyaltyMembers, fetchTierBenefits, type LoyaltyMember, type TierBenefit } from "@/lib/api";

export default function LoyaltyPage() {
    const [members, setMembers] = useState<LoyaltyMember[]>([]);
    const [benefits, setBenefits] = useState<TierBenefit[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [membersResult, benefitsResult] = await Promise.all([fetchLoyaltyMembers(), fetchTierBenefits()]);
                setMembers(membersResult.members || []);
                setBenefits(benefitsResult.benefits || []);
            } finally { setLoading(false); }
        };
        fetchData();
    }, []);

    const stats = { totalMembers: members.length, totalPoints: members.reduce((sum, m) => sum + m.points, 0), bronze: members.filter((m) => m.tier === "BRONZE").length, silver: members.filter((m) => m.tier === "SILVER").length, gold: members.filter((m) => m.tier === "GOLD").length, platinum: members.filter((m) => m.tier === "PLATINUM").length };

    const getTierColor = (tier: string) => { switch (tier) { case "BRONZE": return "bg-amber-100 text-amber-800"; case "SILVER": return "bg-gray-100 text-gray-800"; case "GOLD": return "bg-yellow-100 text-yellow-800"; case "PLATINUM": return "bg-blue-100 text-blue-800"; default: return "bg-gray-100"; } };

    return (
        <div className="space-y-6">
            <PageHeader title="Loyalty Program" description="Manage guest loyalty points and tier benefits" />
            <div className="grid gap-4 sm:grid-cols-4">
                <StatCard label="Total Members" value={stats.totalMembers} icon={Award} />
                <StatCard label="Total Points" value={stats.totalPoints.toLocaleString()} icon={Star} />
                <StatCard label="Gold Members" value={stats.gold} icon={Award} />
                <StatCard label="Platinum Members" value={stats.platinum} icon={Award} />
            </div>

            {/* Tier Benefits */}
            <Card>
                <CardHeader><CardTitle className="font-heading text-lg">Tier Benefits</CardTitle></CardHeader>
                <CardContent>
                    {loading ? <div className="h-32 animate-pulse rounded-lg bg-muted" /> : (
                        <div className="grid gap-4 sm:grid-cols-4">
                            {benefits.map((benefit) => (
                                <div key={benefit.tier} className={`p-4 rounded-lg ${getTierColor(benefit.tier)}`}>
                                    <h3 className="font-semibold text-lg">{benefit.tier}</h3>
                                    <div className="mt-2 space-y-1 text-sm">
                                        <p>Discount: {benefit.discountPercentage}%</p>
                                        <p>Points Multiplier: {benefit.pointsMultiplier}x</p>
                                        <p>Free Upgrade: {benefit.freeUpgrade ? "Yes" : "No"}</p>
                                        <p>Late Checkout: {benefit.lateCheckout ? "Yes" : "No"}</p>
                                        <p>Priority Service: {benefit.priorityService ? "Yes" : "No"}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Members List */}
            <Card>
                <CardHeader><CardTitle className="font-heading text-lg">Loyalty Members</CardTitle></CardHeader>
                <CardContent>
                    {loading ? <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)}</div> : members.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground">No loyalty members yet</p>
                    ) : (
                        <div className="space-y-3">
                            {members.map((member) => (
                                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getTierColor(member.tier)}`}><Award className="h-6 w-6" /></div>
                                        <div>
                                            <div className="flex items-center gap-2"><p className="font-semibold">{member.guest.name}</p><Badge className={getTierColor(member.tier)}>{member.tier}</Badge></div>
                                            <p className="text-sm text-muted-foreground">{member.guest.email} · {member.guest.phone}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-primary">{member.points.toLocaleString()}</p>
                                        <p className="text-xs text-muted-foreground">Points</p>
                                        <p className="text-xs text-muted-foreground">Lifetime: {member.lifetimePoints.toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
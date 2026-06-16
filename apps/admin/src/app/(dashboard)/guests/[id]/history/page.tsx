"use client";

// apps/admin/src/app/(dashboard)/guests/[id]/history/page.tsx
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Calendar, DollarSign, Tag, MessageSquare, Plus } from "lucide-react";
import { PageHeader, Button, Card, CardContent, CardHeader, CardTitle, Badge, StatCard, DataTable, type ColumnDef, Label, Input, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@the-rooms/ui";
import { formatCurrency, formatDate } from "@the-rooms/ui";
import { fetchGuestHistory, fetchGuestNotes, fetchGuestTags, addGuestNote, addGuestTag, removeGuestTag, type GuestStayHistory, type GuestSpendingHistory, type GuestNote, type GuestTag } from "@/lib/api";

export default function GuestHistoryPage() {
    const params = useParams();
    const guestId = params.id as string;
    const [stays, setStays] = useState<GuestStayHistory[]>([]);
    const [spending, setSpending] = useState<GuestSpendingHistory | null>(null);
    const [notes, setNotes] = useState<GuestNote[]>([]);
    const [tags, setTags] = useState<GuestTag[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [showTagModal, setShowTagModal] = useState(false);
    const [newNote, setNewNote] = useState("");
    const [newTag, setNewTag] = useState("");

    const fetchData = async () => {
        setLoading(true);
        try {
            const [historyResult, notesResult, tagsResult] = await Promise.all([
                fetchGuestHistory(guestId),
                fetchGuestNotes(guestId),
                fetchGuestTags(guestId),
            ]);
            setStays(historyResult.stays || []);
            setSpending(historyResult.spending);
            setNotes(notesResult.notes || []);
            setTags(tagsResult.tags || []);
        } finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, [guestId]);

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        await addGuestNote(guestId, newNote);
        setNewNote("");
        setShowNoteModal(false);
        fetchData();
    };

    const handleAddTag = async () => {
        if (!newTag.trim()) return;
        await addGuestTag(guestId, newTag);
        setNewTag("");
        setShowTagModal(false);
        fetchData();
    };

    const handleRemoveTag = async (tagId: string) => {
        await removeGuestTag(guestId, tagId);
        fetchData();
    };

    const stayColumns: ColumnDef<GuestStayHistory, unknown>[] = [
        { accessorKey: "bookingNumber", header: "Booking", cell: ({ row }) => <code className="font-semibold">{row.original.bookingNumber}</code> },
        { accessorKey: "room.roomNumber", header: "Room", cell: ({ row }) => <span>Room {row.original.room.roomNumber}</span> },
        { accessorKey: "checkIn", header: "Check-in", cell: ({ row }) => <span className="text-sm">{formatDate(row.original.checkIn, "short")}</span> },
        { accessorKey: "checkOut", header: "Check-out", cell: ({ row }) => <span className="text-sm">{formatDate(row.original.checkOut, "short")}</span> },
        { accessorKey: "totalAmount", header: "Amount", cell: ({ row }) => <span className="font-semibold">{formatCurrency(Number(row.original.totalAmount))}</span> },
        { accessorKey: "status", header: "Status", cell: ({ row }) => <Badge variant={row.original.status === "CHECKED_OUT" ? "success" : "secondary"}>{row.original.status}</Badge> },
    ];

    return (
        <div className="space-y-6">
            <PageHeader title="Guest History" description={`Complete history for guest ${guestId}`} actions={<><Button variant="outline" onClick={() => setShowNoteModal(true)}><MessageSquare className="h-4 w-4 mr-2" />Add Note</Button><Button onClick={() => setShowTagModal(true)}><Tag className="h-4 w-4 mr-2" />Add Tag</Button></>} />

            {/* Spending Summary */}
            {spending && (
                <div className="grid gap-4 sm:grid-cols-4">
                    <StatCard label="Total Spent" value={formatCurrency(spending.totalSpent)} icon={DollarSign} />
                    <StatCard label="Total Stays" value={spending.bookingCount} icon={Calendar} />
                    <StatCard label="Avg per Stay" value={formatCurrency(spending.averagePerStay)} icon={DollarSign} />
                </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
                <Card>
                    <CardHeader><CardTitle className="font-heading text-lg flex items-center gap-2"><Tag className="h-5 w-5" />Tags</CardTitle></CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {tags.map((tag) => (
                                <Badge key={tag.id} variant="secondary" className="flex items-center gap-1">
                                    {tag.name}
                                    <button onClick={() => handleRemoveTag(tag.id)} className="ml-1 hover:text-destructive">&times;</button>
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Notes */}
            {notes.length > 0 && (
                <Card>
                    <CardHeader><CardTitle className="font-heading text-lg flex items-center gap-2"><MessageSquare className="h-5 w-5" />Notes</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {notes.map((note) => (
                                <div key={note.id} className="p-3 bg-muted rounded-lg">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-sm">{note.createdBy.name}</span>
                                        <span className="text-xs text-muted-foreground">{formatDate(note.createdAt, "short")}</span>
                                    </div>
                                    <p className="text-sm">{note.content}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Stay History */}
            <Card>
                <CardHeader><CardTitle className="font-heading text-lg flex items-center gap-2"><Calendar className="h-5 w-5" />Stay History</CardTitle></CardHeader>
                <CardContent>
                    {loading ? <div className="h-32 animate-pulse rounded-lg bg-muted" /> : stays.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground">No stay history</p>
                    ) : (
                        <DataTable columns={stayColumns} data={stays} isLoading={loading} pageSize={10} filterPlaceholder="Filter stays..." />
                    )}
                </CardContent>
            </Card>

            {/* Add Note Dialog */}
            <Dialog open={showNoteModal} onOpenChange={setShowNoteModal}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add Note</DialogTitle></DialogHeader>
                    <div className="py-4"><textarea className="w-full h-24 p-3 border rounded-lg text-sm" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Enter note..." /></div>
                    <DialogFooter><Button variant="outline" onClick={() => setShowNoteModal(false)}>Cancel</Button><Button onClick={handleAddNote}>Add Note</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Tag Dialog */}
            <Dialog open={showTagModal} onOpenChange={setShowTagModal}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add Tag</DialogTitle></DialogHeader>
                    <div className="py-4"><Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Enter tag name..." /></div>
                    <DialogFooter><Button variant="outline" onClick={() => setShowTagModal(false)}>Cancel</Button><Button onClick={handleAddTag}>Add Tag</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
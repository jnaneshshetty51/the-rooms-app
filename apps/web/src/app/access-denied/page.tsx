export default function AccessDeniedPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center">
            <h1 className="text-2xl font-bold">Access Denied</h1>
            <p className="text-muted-foreground">You do not have permission to access this page.</p>
            <a href="/" className="mt-4 text-primary hover:underline">
                Go back home
            </a>
        </div>
    );
}
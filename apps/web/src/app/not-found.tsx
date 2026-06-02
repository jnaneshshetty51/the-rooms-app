import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center animate-fade-in-up">
      <div className="relative mb-8">
        <h1 className="text-9xl font-bold text-primary opacity-10">404</h1>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-semibold text-secondary bg-background px-4">
            Page Not Found
          </span>
        </div>
      </div>
      
      <h2 className="text-3xl font-bold text-primary mb-4 tracking-tight">
        Looks like you've wandered off the map.
      </h2>
      <p className="text-muted text-lg mb-10 max-w-md">
        The room or page you are looking for does not exist, has been moved, or is temporarily unavailable.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <Link 
          href="/"
          className="bg-secondary hover:bg-secondary/90 text-white font-medium py-3 px-8 rounded-full transition-all duration-200 card-hover inline-flex justify-center items-center"
        >
          Return to Lobby
        </Link>
        <Link 
          href="/rooms"
          className="bg-white border border-border hover:border-secondary hover:text-secondary text-primary font-medium py-3 px-8 rounded-full transition-all duration-200 inline-flex justify-center items-center"
        >
          View Our Rooms
        </Link>
      </div>
    </div>
  );
}

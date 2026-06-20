let isShuttingDown = false;

export function setupGracefulShutdown(handlers: {
    onShutdown: () => Promise<void>;
}) {
    const shutdown = async () => {
        if (isShuttingDown) return;
        isShuttingDown = true;

        console.log('Received shutdown signal, closing connections...');

        try {
            await handlers.onShutdown();
            console.log('Shutdown complete');
            process.exit(0);
        } catch (err) {
            console.error('Error during shutdown:', err);
            process.exit(1);
        }
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}

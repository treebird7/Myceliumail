import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function startDashboard(port = 3737) {
    const fastify = Fastify({ logger: true });

    // Serve static files
    await fastify.register(fastifyStatic, {
        root: join(__dirname, 'public'),
        prefix: '/'
    });

    // Register routes
    // dynamic import to avoid circular dependencies if any, though here it is clean
    const { registerRoutes } = await import('./routes.js');
    await registerRoutes(fastify);

    // Start server
    try {
        await fastify.listen({ port, host: '127.0.0.1' });
        console.log(`🍄 Dashboard running on http://localhost:${port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }

    return fastify;
}

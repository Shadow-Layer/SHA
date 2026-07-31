# Runtime-only Dockerfile
# Assumes .next, public, and node_modules are pre-built on host via: npm ci && npm run build && npm prune --production
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy pre-built artifacts and dependencies from host
COPY --chown=nextjs:nodejs .next ./.next
COPY --chown=nextjs:nodejs public ./public
COPY --chown=nextjs:nodejs node_modules ./node_modules
COPY --chown=nextjs:nodejs package*.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]

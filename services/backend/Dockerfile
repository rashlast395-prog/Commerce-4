FROM node:20-slim AS build
WORKDIR /repo

# Install with full workspace context so workspace: deps (@richys-eat/shared-types
# etc.) resolve correctly, then build only what the backend needs.
COPY package.json package-lock.json* ./
COPY packages ./packages
COPY services/backend ./services/backend
RUN npm install --workspaces --include-workspace-root --no-audit --no-fund

RUN npm run build --workspace=packages/shared-types
RUN npm run build --workspace=services/backend

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /repo/services/backend/dist ./dist
COPY --from=build /repo/services/backend/package.json ./package.json
COPY --from=build /repo/node_modules ./node_modules

EXPOSE 4000
CMD ["node", "dist/index.js"]

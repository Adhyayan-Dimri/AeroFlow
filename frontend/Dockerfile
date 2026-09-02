FROM node:18-alpine AS builder

WORKDIR /app

ARG REACT_APP_BACKEND_URL=""
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}
ENV CI=false

COPY package.json yarn.lock* package-lock.json* ./

RUN if [ -f yarn.lock ]; then yarn --frozen-lockfile || yarn; \
    elif [ -f package-lock.json ]; then npm ci || npm install; \
    else npm install; fi

COPY . .

RUN if [ -f yarn.lock ]; then yarn build; else npm run build; fi

FROM nginx:alpine AS runner

RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

COPY --from=builder /app/build /usr/share/nginx/html

COPY nginx.conf /etc/nginx/templates/default.conf.template

ENV BACKEND_UPSTREAM="backend:8001"

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

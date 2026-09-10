FROM docker.stirlingpdf.com/stirlingtools/stirling-pdf:latest AS builder

RUN test -f /scripts/init.sh
RUN java -version

FROM alpine:3.24

RUN apk add --no-cache ca-certificates
RUN addgroup -S app \
    && adduser -S -G app app

ARG CACHE_TEST_REVISION=2
ENV CACHE_TEST_REVISION=${CACHE_TEST_REVISION}

LABEL org.opencontainers.image.title="cache-the-planet Docker cache example" \
      org.opencontainers.image.description="Small reproducible image used to verify cache key changes" \
      cache.the-planet.test-revision="${CACHE_TEST_REVISION}"

RUN printf 'cache-test-revision=%s\n' "$CACHE_TEST_REVISION" > /tmp/cache-test-revision \
    && test -s /tmp/cache-test-revision

WORKDIR /app
COPY --chown=app:app hello.txt .

USER app

CMD ["cat", "/app/hello.txt"]

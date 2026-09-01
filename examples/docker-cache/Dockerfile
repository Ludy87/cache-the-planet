FROM docker.stirlingpdf.com/stirlingtools/stirling-pdf:latest AS builder

RUN test -f /scripts/init.sh
RUN java -version

FROM alpine:3.22

RUN apk add --no-cache ca-certificates

ARG CACHE_TEST_REVISION=2
ENV CACHE_TEST_REVISION=${CACHE_TEST_REVISION}

LABEL org.opencontainers.image.title="cache-the-planet Docker cache example" \
      org.opencontainers.image.description="Small reproducible image used to verify cache key changes" \
      cache.the-planet.test-revision="${CACHE_TEST_REVISION}"

RUN printf 'cache-test-revision=%s\n' "$CACHE_TEST_REVISION" > /tmp/cache-test-revision \
    && test -s /tmp/cache-test-revision

WORKDIR /app
COPY hello.txt .

CMD ["cat", "/app/hello.txt"]

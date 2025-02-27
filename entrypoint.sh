#!/bin/sh

# Start the waitress server
IS_CLOUDFLARE=1 waitress-serve --host=0.0.0.0 --port=8080 wsgi:app

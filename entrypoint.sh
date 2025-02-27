#!/bin/sh

# Start the waitress server
waitress-serve --host=0.0.0.0 --port=8080 wsgi:app

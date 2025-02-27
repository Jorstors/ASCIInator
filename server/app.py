#!/usr/bin/python3

from flask_limiter import Limiter, RateLimitExceeded
from flask_limiter.util import get_remote_address
from flask_compress import Compress
from flask import Flask, request
from PIL import Image
import requests
import os.path
import base64
import flask
import sys
import io

POSITIVE_CHARSET = ' .:-=+*#%@'
NEGATIVE_CHARSET = POSITIVE_CHARSET[::-1] # reversed POSITIVE_CHARSET
PROMPT_PREFIX = "make a drawing of a high contrast, black and white, minimalistic "
MODEL = "@cf/black-forest-labs/flux-1-schnell"

CLOUDFLARE_ACCOUNT_ID = os.getenv('CLOUDFLARE_ACCOUNT_ID')
CLOUDFLARE_API_KEY = os.getenv('CLOUDFLARE_API_KEY')

if not CLOUDFLARE_ACCOUNT_ID or not CLOUDFLARE_API_KEY:
    raise RuntimeError("Cloudflare account ID and API key must be set in environment variables")

CLOUDFLARE_URL = f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/run/{MODEL}"
cloudflare_session = requests.Session()
cloudflare_session.headers.update({
    'Authorization': f'Bearer {CLOUDFLARE_API_KEY}',
    'Content-Type': 'application/json'
})

# Add image_to_ascii/ as a module search directory
try:
    sys.path.append(os.path.join(os.path.dirname(__file__), "image_to_ascii"))
    from converter import image_to_ascii
except ImportError as e:
    print("Failed to import image_to_ascii", e.with_traceback())
    sys.exit(1)

def get_cloudflare_user_ip():
    # Throws an exception if the header does not exist, because if the header isn't
    # there for legitimate requests, it's probably spoofable, which is bad.
    return request.headers["CF-Connecting-IP"]

# If we're on Cloudflare (defined in `entrypoint.sh`), use the proxied IP address
if os.getenv('IS_CLOUDFLARE'):
    print("Cloudflare proxy headers will be read for the client's real IP")
    get_ip_func = get_cloudflare_user_ip
else:
    print("You have not told the app that it's running on Cloudflare. If you are running behind a proxy, the rate limiting may not work as expected!")
    get_ip_func = get_remote_address

app = Flask(__name__)
Compress(app)
limiter = Limiter(get_ip_func, app=app, headers_enabled=True)

# Function to call the text-to-image generation endpoint
def generate_images(prompt):
    data = {
        'prompt': prompt
    }
    response = cloudflare_session.post(CLOUDFLARE_URL, json=data, stream=True)
    
    if not response.ok:
        print("Server returned an error: " + response.text)
        raise RuntimeError("Server returned an error")

    response_data = response.json()
    image_data = response_data.get('result', {}).get('image')

    if not image_data:
        print("No image data found: " + response.text)
        raise RuntimeError("No image data found in the response")

    image_bytes = base64.b64decode(image_data)
    image = Image.open(io.BytesIO(image_bytes))
    image.save(f"{prompt}.jpg")

@app.route("/get-art")
def getArt():
    if "prompt" not in request.args:
        return "Invalid request: prompt is required", 400
    if len(request.args["prompt"]) > 500:
        return "Invalid request: prompt too long", 400

    prompt = PROMPT_PREFIX + request.args["prompt"]
    filename = prompt + ".jpg"
    if not os.path.isfile(filename):
        try:
            with limiter.limit("5/day"):
                generate_images(prompt)
        except RuntimeError:
            return "Failed to generate image", 503
        except RateLimitExceeded:
            return "Rate limit exceeded", 429

    s = request.args.get("size", 1, type=int)
    return image_to_ascii(filename, size=(s,s), charset=NEGATIVE_CHARSET)

@app.route("/")
def m():
    return flask.send_file("../index.html")

@app.route("/public/<path:path>")
def public(path):
    return flask.send_from_directory("../public", path)

#!/usr/bin/env python3
"""TendHunt API query helper for OpenClaw."""

import os
import json
import urllib.request
import urllib.parse

BASE_URL = os.environ.get("TENDHUNT_BASE_URL", "https://app.tendhunt.com")
API_KEY = os.environ.get("TENDHUNT_API_KEY", "")


def query(endpoint: str, params: dict | None = None) -> dict:
    url = f"{BASE_URL}{endpoint}"
    if params:
        url += "?" + urllib.parse.urlencode({k: v for k, v in params.items() if v})

    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {API_KEY}")
    req.add_header("Accept", "application/json")

    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: query.py <endpoint> [key=value ...]")
        sys.exit(1)

    endpoint = sys.argv[1]
    params = {}
    for arg in sys.argv[2:]:
        if "=" in arg:
            k, v = arg.split("=", 1)
            params[k] = v

    result = query(endpoint, params)
    print(json.dumps(result, indent=2))

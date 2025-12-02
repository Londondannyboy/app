#!/usr/bin/env python3
"""
Update Hume EVI config to point to new Vercel endpoint
"""
import asyncio
from hume import AsyncHumeClient

# Your Hume credentials
HUME_API_KEY = "gzwF7lPBfIshOhve04HLNPs5RluArU7oXQZaqnqYKi6KKQef"
HUME_SECRET_KEY = "cN0BYa70A0I6jAkO8Alt8VHaRzdIRVJahWFHaLza7cGfq2tAvuzAGeEmRDGURA3i"

# Your new Relocation config
CONFIG_ID = "d0e862f0-20f7-487e-8ea4-f9cb11c0e6ca"

# IMPORTANT: Update this with your actual Vercel URL
VERCEL_URL = "https://YOUR-VERCEL-URL.vercel.app"  # ⚠️ CHANGE THIS!

async def update_config():
    client = AsyncHumeClient(api_key=HUME_API_KEY)

    print(f"Updating Hume config {CONFIG_ID}...")
    print(f"New endpoint: {VERCEL_URL}/api/voice/chat/completions")

    result = await client.empathic_voice.configs.create_config_version(
        id=CONFIG_ID,
        version_description=f"Updated to Vercel endpoint - {VERCEL_URL}",
        language_model={
            "model_provider": "CUSTOM_LANGUAGE_MODEL",
            "model_resource": f"{VERCEL_URL}/api/voice/chat/completions",
            "temperature": 0.7
        },
        voice={
            "provider": "HUME_AI",
            "name": "ITO"
        },
        evi_version="3"
    )

    print(f"✅ Success!")
    print(f"Config ID: {result.id}")
    print(f"Version: {result.version}")
    print(f"Endpoint: {result.language_model.model_resource}")

if __name__ == "__main__":
    asyncio.run(update_config())

from dotenv import load_dotenv
import os
import httpx

load_dotenv()

key = os.getenv("GROQ_API_KEY")

if not key:
    print("ERROR: GROQ_API_KEY is not configured.")
    raise SystemExit(1)

response = httpx.get(
    "https://api.groq.com/openai/v1/models",
    headers={
        "Authorization": f"Bearer {key}"
    },
    timeout=20.0,
)

print("HTTP:", response.status_code)

if response.status_code != 200:
    print(response.text)
    raise SystemExit(1)

models = response.json().get("data", [])

for model in sorted(models, key=lambda item: item["id"]):
    if model.get("active", True):
        print(model["id"])

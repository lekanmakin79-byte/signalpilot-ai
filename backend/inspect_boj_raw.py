import asyncio
import httpx

async def main():
    url = "https://www.stat-search.boj.or.jp/api/v1/getDataCode"

    params = {
        "format": "json",
        "lang": "en",
        "db": "FM01",
        "code": "STRDCLUCON",
        "startDate": "202501",
    }

    headers = {
        "User-Agent": "SignalPilot-AI/1.0",
        "Accept": "application/json",
    }

    async with httpx.AsyncClient(
        timeout=15,
        follow_redirects=True,
    ) as client:
        response = await client.get(
            url,
            params=params,
            headers=headers,
        )

        print("STATUS:", response.status_code)
        print("CONTENT-TYPE:", response.headers.get("content-type"))
        print(response.text[:10000])


asyncio.run(main())

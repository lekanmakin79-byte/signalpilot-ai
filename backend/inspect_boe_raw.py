import asyncio
import httpx

async def main():
    url = "https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp"

    params = {
        "CodeVer": "new",
        "xml.x": "yes",
        "Datefrom": "01/Jan/2025",
        "Dateto": "now",
        "SeriesCodes": "IUDBEDR",
        "UsingCodes": "Y",
        "VPD": "Y",
        "VFD": "N",
    }

    headers = {
        "User-Agent": "SignalPilot-AI/1.0",
        "Accept": "application/xml,text/xml,*/*",
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
        print(response.text[:5000])


asyncio.run(main())

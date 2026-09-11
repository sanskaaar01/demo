import re
from datetime import datetime


def process_query(query: str):
    text = query.lower().strip()

    analysis_type = "general"
    if any(x in text for x in ["change", "changed", "growth", "before", "after", "between"]):
        analysis_type = "change_detection"
    elif any(x in text for x in ["flood", "flooding", "water"]):
        analysis_type = "water_detection"
    elif any(x in text for x in ["vegetation", "ndvi", "forest", "greenery"]):
        analysis_type = "vegetation_analysis"
    elif any(x in text for x in ["building", "construction", "urban"]):
        analysis_type = "urban_change"

    locations = [
        "mumbai", "delhi", "pune", "bangalore", "bengaluru",
        "hyderabad", "chennai", "kolkata", "ahmedabad",
        "india", "goa"
    ]

    location = "Unknown"
    for loc in locations:
        if loc in text:
            location = loc.title()
            break

    years = [int(x) for x in re.findall(r"\b(19\d{2}|20\d{2})\b", text)]

    if len(years) >= 2:
        start_year, end_year = min(years), max(years)
    elif len(years) == 1:
        start_year, end_year = years[0], datetime.now().year
    else:
        start_year, end_year = datetime.now().year - 5, datetime.now().year

    comparison = len(years) >= 2 or analysis_type in {
        "change_detection",
        "urban_change"
    }

    return {
        "analysis_type": analysis_type,
        "technical_task": (
            "Compare satellite observations across dates"
            if comparison else
            "Analyze satellite imagery for the requested condition"
        ),
        "location": {
            "name": location,
            "latitude": None,
            "longitude": None
        },
        "data_requirements": {
            "dataset": "NASA GIBS / MODIS Terra",
            "resolution": "Approx. 250 m",
            "time_range": f"{start_year} - {end_year}",
            "cloud_cover": "Not available from GIBS metadata"
        },
        "years": {
            "before": start_year,
            "after": end_year
        },
        "comparison_required": comparison
    }

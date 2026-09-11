import os
import requests


def fallback_recommendations(
    analysis_type,
    change_percentage,
    location
):
    if analysis_type == "water_detection":
        problem = "Water-related spatial change detected."
        actions = [
            "Inspect affected areas with higher-resolution imagery.",
            "Assess drainage and flood-management infrastructure.",
            "Increase monitoring during future rainfall events."
        ]
        priority = "High"

    elif analysis_type == "vegetation_analysis":
        problem = "Potential vegetation change detected."
        actions = [
            "Inspect areas showing vegetation loss.",
            "Assess land-use and irrigation conditions.",
            "Consider vegetation restoration where appropriate."
        ]
        priority = "Medium"

    elif analysis_type == "urban_change":
        problem = "Potential urban development detected."
        actions = [
            "Review newly changed built-up areas.",
            "Assess infrastructure requirements.",
            "Monitor expansion against approved land-use plans."
        ]
        priority = "Medium"

    else:
        problem = "Visible spatial change detected."
        actions = [
            "Inspect the highlighted regions using higher-resolution imagery.",
            "Compare additional dates to confirm the trend.",
            "Use local ground observations before taking operational action."
        ]
        priority = "Medium"

    return {
        "problem": problem,
        "why_it_matters": (
            f"Approximately {change_percentage}% of the compared "
            f"image area exceeded the visual-change threshold for "
            f"{location}."
        ),
        "actions": actions,
        "priority": priority,
        "reason": (
            "Priority is based on the detected change magnitude "
            "and the requested analysis category."
        ),
        "source": "Rule-based evidence-aware recommendation"
    }


def generate_recommendations(
    analysis_type,
    change_percentage,
    location
):
    api_key = os.getenv("OPENAI_API_KEY")

    if not api_key:
        return fallback_recommendations(
            analysis_type,
            change_percentage,
            location
        )

    # Optional AI layer.
    # Fallback remains available if the API fails.

    try:
        prompt = f"""
You are an environmental/satellite-analysis decision support assistant.

Evidence:
Location: {location}
Analysis type: {analysis_type}
Detected visual change: {change_percentage}%

Base recommendations ONLY on this evidence.
Do not invent measurements.
Clearly distinguish observation from interpretation.
Provide three practical actions ranked by priority.
"""

        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": os.getenv(
                    "OPENAI_MODEL",
                    "gpt-4o-mini"
                ),
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0.2
            },
            timeout=20
        )

        if response.ok:
            text = response.json()["choices"][0]["message"]["content"]

            return {
                "problem": "Satellite-detected spatial change",
                "why_it_matters": (
                    "The recommendation layer interpreted the "
                    "measured change evidence."
                ),
                "actions": [
                    text
                ],
                "priority": "Medium",
                "reason": "Generated from supplied analysis evidence.",
                "source": "AI recommendation layer"
            }

    except Exception:
        pass

    return fallback_recommendations(
        analysis_type,
        change_percentage,
        location
    )

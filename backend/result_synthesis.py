def synthesize_result(
    query,
    query_profile,
    quality,
    model,
    expertise="student"
):
    analysis_type = query_profile["analysis_type"]
    location = query_profile["location"]["name"]
    years = query_profile["years"]

    if analysis_type == "change_detection":
        result = (
            f"Satellite imagery comparison for {location} "
            f"between {years['before']} and {years['after']} "
            f"was prepared for change analysis."
        )

    elif analysis_type == "water_detection":
        result = (
            f"Satellite imagery for {location} was prepared "
            f"for water-related analysis."
        )

    elif analysis_type == "vegetation_analysis":
        result = (
            f"Satellite imagery for {location} was prepared "
            f"for vegetation analysis."
        )

    elif analysis_type == "urban_change":
        result = (
            f"Satellite imagery for {location} was prepared "
            f"for urban-change analysis."
        )

    else:
        result = (
            f"Satellite imagery analysis was prepared for "
            f"{location}."
        )

    return {
        "result": result,
        "observation": (
            "The result is based on satellite imagery and the "
            "configured image-analysis workflow."
        ),
        "limitation": (
            "Visual change detection is an analytical proxy and "
            "should be validated with higher-resolution imagery "
            "or ground observations before operational decisions."
        ),
        "confidence": "Moderate"
    }

def select_model(analysis_type: str):
    models = {
        "change_detection": (
            "Satellite Change Detection Model",
            "Compares imagery from different dates to identify spatial changes."
        ),
        "water_detection": (
            "Water Detection Model",
            "Analyzes satellite imagery for visible water-related changes."
        ),
        "vegetation_analysis": (
            "Vegetation Analysis Model",
            "Analyzes vegetation-related satellite observations."
        ),
        "urban_change": (
            "Urban Change Detection Model",
            "Identifies visible changes associated with urban development."
        ),
        "general": (
            "Satellite Intelligence Model",
            "General-purpose satellite imagery analysis."
        )
    }

    name, description = models.get(
        analysis_type,
        models["general"]
    )

    return {
        "name": name,
        "description": description
    }

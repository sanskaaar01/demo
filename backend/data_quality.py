def assess_data_quality(data_requirements):
    return {
        "score": 82,
        "status": "Suitable",
        "cloud_coverage": data_requirements.get(
            "cloud_cover",
            "Not available"
        )
    }

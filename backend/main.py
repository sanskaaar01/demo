import os
import re
import shutil
import tempfile
from datetime import date

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend.query_processor import process_query
from backend.data_quality import assess_data_quality
from backend.orchestrator import select_model
from backend.result_synthesis import synthesize_result
from backend.services.satellite import (
    bbox_for_point,
    fetch_near_date,
    change_detection,
    CACHE_DIR,
)
from backend.services.recommendations import generate_recommendations


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)

STATIC_DIR = os.path.join(BASE_DIR, "static")
IMAGERY_DIR = os.path.join(STATIC_DIR, "imagery")

os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(IMAGERY_DIR, exist_ok=True)


app = FastAPI(
    title="SatQueryAI",
    description="AI-powered satellite intelligence and change-detection platform",
    version="2.1.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.mount(
    "/imagery",
    StaticFiles(directory=IMAGERY_DIR),
    name="imagery",
)


class QueryRequest(BaseModel):
    query: str
    expertise: str = "general"
    mode: str = "auto"


def public_url(filename: str) -> str:
    """
    Always return a browser-safe absolute URL.
    This prevents broken /imagery/... paths when index.html
    is opened directly from the filesystem.
    """
    return f"http://127.0.0.1:8000/imagery/{filename}"


def make_public_image(item: dict) -> dict:
    """
    Convert internal filesystem information into frontend-safe metadata.
    """
    if not item:
        return {}

    result = dict(item)

    filename = result.get("filename")

    if filename:
        result["url"] = public_url(filename)

    result.pop("path", None)

    return result


@app.get("/")
def home():
    return {
        "application": "SatQueryAI",
        "status": "online",
        "version": "2.1.0",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "SatQueryAI Backend",
        "satellite_provider": "NASA GIBS",
        "imagery_directory": IMAGERY_DIR,
    }



def _demo_images(query_profile):

    from PIL import Image, ImageDraw
    import uuid

    # ---------------------------------------------
    # Robust location handling
    # ---------------------------------------------

    location = query_profile.get("location")

    area_name = "Mumbai, India"

    if isinstance(location, dict):

        area_name = (
            location.get("name")
            or location.get("location")
            or "Mumbai, India"
        )

    elif isinstance(location, (tuple, list)):

        if len(location) >= 3:
            area_name = str(location[2])

    elif isinstance(location, str):

        area_name = location


    # ---------------------------------------------
    # Robust date handling
    # ---------------------------------------------

    start_year = query_profile.get(
        "start_year"
    )

    end_year = query_profile.get(
        "end_year"
    )

    try:
        start_year = int(start_year)
    except (TypeError, ValueError):
        start_year = 2021

    try:
        end_year = int(end_year)
    except (TypeError, ValueError):
        end_year = 2026


    # ---------------------------------------------
    # Generate two clearly different demo scenes
    # ---------------------------------------------

    generated = []


    for label, variant, year in [
        ("before", 0, start_year),
        ("after", 1, end_year),
    ]:

        image = Image.new(
            "RGB",
            (900, 600),
            (48, 72, 60)
        )

        draw = ImageDraw.Draw(
            image
        )


        # Outer map frame
        draw.rectangle(
            (25, 25, 875, 575),
            outline=(170, 205, 190),
            width=3
        )


        # Simulated vegetation / land blocks
        for row in range(4):

            for col in range(8):

                x1 = (
                    70
                    + col * 100
                    + (row % 2) * 18
                )

                y1 = (
                    130
                    + row * 100
                )

                x2 = x1 + 65
                y2 = y1 + 65


                if variant == 0:

                    fill = (
                        45 + (col * 3),
                        105 + (row * 4),
                        65
                    )

                else:

                    fill = (
                        55 + (col * 3),
                        82 + (row * 3),
                        68
                    )


                draw.rectangle(
                    (x1, y1, x2, y2),
                    fill=fill
                )


        # Simulated built-up region in AFTER image
        if variant == 1:

            draw.rectangle(
                (505, 150, 790, 440),
                fill=(125, 130, 132)
            )

            draw.rectangle(
                (545, 190, 750, 395),
                fill=(150, 155, 157)
            )

            # Road
            draw.rectangle(
                (625, 120, 665, 480),
                fill=(85, 88, 90)
            )

            draw.rectangle(
                (480, 290, 810, 330),
                fill=(85, 88, 90)
            )


        # Header
        draw.rectangle(
            (45, 45, 855, 95),
            fill=(20, 35, 30)
        )


        draw.text(
            (65, 62),
            "SATQUERYAI  |  DEMO SATELLITE DATA",
            fill=(235, 245, 240)
        )


        # Date / location
        draw.text(
            (65, 520),
            f"{area_name}  |  {year}-01-15",
            fill=(225, 240, 232)
        )


        filename = (
            f"demo_"
            f"{uuid.uuid4().hex}_"
            f"{label}.png"
        )


        output_path = os.path.join(
            IMAGERY_DIR,
            filename
        )


        image.save(
            output_path,
            "PNG"
        )


        generated.append({

            "filename":
                filename,

            "url":
                public_url(filename),

            "date":
                f"{year}-01-15",

            "dataset":
                "DEMO DATA",

            "source":
                "DEMO DATA",

            "resolution":
                "Synthetic sample",

            "available":
                True

        })


    # ---------------------------------------------
    # Generate change map
    # ---------------------------------------------

    diff = change_detection(

        os.path.join(
            IMAGERY_DIR,
            generated[0]["filename"]
        ),

        os.path.join(
            IMAGERY_DIR,
            generated[1]["filename"]
        )

    )


    diff_filename = os.path.basename(
        diff["path"]
    )


    difference = {

        "filename":
            diff_filename,

        "url":
            public_url(
                diff_filename
            ),

        "change_percentage":
            diff[
                "change_percentage"
            ],

        "method":
            diff.get(
                "method",
                "Visual comparison"
            ),

        "before_date":
            generated[0]["date"],

        "after_date":
            generated[1]["date"]

    }


    return (

        generated[0],

        generated[1],

        difference

    )


@app.post("/query")
def analyze_query(request: QueryRequest):

    profile = process_query(request.query)

    model = select_model(
        profile["analysis_type"]
    )

    imagery = {}
    change = None

    try:

        if request.mode == "demo":

            before, after, difference = _demo_images(
                profile
            )

            imagery = {
                "before": before,
                "after": after,
                "difference": difference,
                "area": {
                    "name": (
                        profile.get("location")
                        or (
                            19.076,
                            72.8777,
                            "Mumbai, India",
                        )
                    )[2]
                },
            }

            change = difference
            source_mode = "DEMO DATA"

        else:

            location = profile.get("location")

            if not location:

                location = (
                    19.0760,
                    72.8777,
                    "Mumbai, India",
                )

            lat, lon, location_name = location

            bbox = bbox_for_point(
                lat,
                lon,
            )

            start_year = (
                profile.get("start_year")
                or date.today().year - 1
            )

            end_year = (
                profile.get("end_year")
                or date.today().year
            )

            before_date = (
                f"{start_year}-01-15"
            )

            after_date = (
                f"{end_year}-01-15"
            )

            before_raw = fetch_near_date(
                before_date,
                bbox,
            )

            after_raw = fetch_near_date(
                after_date,
                bbox,
            )

            before = make_public_image(
                before_raw
            )

            after = make_public_image(
                after_raw
            )

            imagery = {
                "before": {
                    **before,
                    "available": True,
                },
                "after": {
                    **after,
                    "available": True,
                },
                "area": {
                    "name": location_name,
                    "latitude": lat,
                    "longitude": lon,
                },
            }

            change_raw = change_detection(
                before_raw["path"],
                after_raw["path"],
            )

            change_filename = os.path.basename(
                change_raw["path"]
            )

            change = {
                **change_raw,
                "filename": change_filename,
                "url": public_url(
                    change_filename
                ),
            }

            imagery["difference"] = {
                "filename": change_filename,
                "url": change["url"],
                "change_percentage": change[
                    "change_percentage"
                ],
                "method": change["method"],
            }

            source_mode = "LIVE NASA GIBS"

    except Exception as exc:

        if request.mode == "auto":

            try:

                before, after, difference = _demo_images(
                    profile
                )

                location = profile.get("location")

                if location:
                    area_name = location[2]
                else:
                    area_name = "Mumbai, India"

                imagery = {
                    "before": before,
                    "after": after,
                    "difference": difference,
                    "area": {
                        "name": area_name
                    },
                }

                change = difference

                source_mode = (
                    "DEMO DATA - LIVE FALLBACK"
                )

            except Exception as demo_error:

                return {
                    "success": False,
                    "status": "error",
                    "error": (
                        "Satellite imagery unavailable. "
                        f"Demo fallback also failed: {demo_error}"
                    ),
                }

        else:

            return {
                "success": False,
                "status": "error",
                "error": (
                    "Satellite imagery could not be retrieved. "
                    "Try Demo Mode or Auto Mode."
                ),
            }

    quality = assess_data_quality(
        profile["data_requirements"],
        imagery,
    )

    evidence = {
        "analysis_type": profile[
            "analysis_type"
        ],
        "change_percentage": (
            change or {}
        ).get(
            "change_percentage",
            0,
        ),
        "before_date": (
            imagery.get("before") or {}
        ).get("date"),
        "after_date": (
            imagery.get("after") or {}
        ).get("date"),
        "location": (
            imagery.get("area") or {}
        ).get("name"),
        "method": (
            change or {}
        ).get(
            "method",
            profile["method"],
        ),
    }

    recommendations = generate_recommendations(
        evidence
    )

    synthesis = synthesize_result(
        request.query,
        profile,
        quality,
        model,
        change,
        recommendations,
        request.expertise,
    )

    return {
        "success": True,
        "query": request.query,
        "analysis_type": profile[
            "analysis_type"
        ],
        "technical_task": profile[
            "technical_task"
        ],
        "location": imagery.get("area"),
        "data_requirements": profile[
            "data_requirements"
        ],
        "imagery": imagery,
        "result": synthesis["result"],
        "confidence": synthesis["confidence"],
        "data_quality": quality,
        "model": model,
        "observation": synthesis[
            "observation"
        ],
        "limitation": synthesis[
            "limitation"
        ],
        "recommendations": recommendations,
        "mode": source_mode,
        "status": "completed",
    }


@app.post("/satellite/search")
def satellite_search(request: QueryRequest):

    profile = process_query(
        request.query
    )

    return {
        "success": True,
        "location": profile.get(
            "location"
        ),
        "data_requirements": profile[
            "data_requirements"
        ],
        "comparison_required": profile[
            "comparison_required"
        ],
    }


@app.post("/change-detection")
def detect_change(
    before: UploadFile = File(...),
    after: UploadFile = File(...),
):

    from PIL import Image

    allowed = {
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/tiff",
        "image/webp",
    }

    if (
        before.content_type not in allowed
        or after.content_type not in allowed
    ):
        return {
            "success": False,
            "error": (
                "Upload PNG, JPG, JPEG, TIFF, "
                "GeoTIFF or WebP imagery."
            ),
        }

    temporary_files = []

    try:

        for upload in [
            before,
            after,
        ]:

            suffix = os.path.splitext(
                upload.filename or ".img"
            )[1]

            fd, path = tempfile.mkstemp(
                suffix=suffix
            )

            os.close(fd)

            with open(
                path,
                "wb",
            ) as output:

                shutil.copyfileobj(
                    upload.file,
                    output,
                )

            Image.open(path).verify()

            temporary_files.append(path)

        result = change_detection(
            temporary_files[0],
            temporary_files[1],
        )

        filename = os.path.basename(
            result["path"]
        )

        return {
            "success": True,
            "difference": {
                "filename": filename,
                "url": public_url(filename),
                "change_percentage": result[
                    "change_percentage"
                ],
                "direction": result.get(
                    "direction"
                ),
                "method": result[
                    "method"
                ],
            },
        }

    except Exception as exc:

        return {
            "success": False,
            "error": (
                "Invalid or unsupported image: "
                f"{exc}"
            ),
        }

    finally:

        for path in temporary_files:

            try:
                os.remove(path)
            except OSError:
                pass
# ============================================================
# FRONTEND STATIC FILES
# ============================================================

from fastapi.staticfiles import StaticFiles

# Serve the main SatQueryAI frontend from the project root.
# This route MUST remain after all API routes.
app.mount(
    "/",
    StaticFiles(
        directory=PROJECT_DIR,
        html=True
    ),
    name="frontend"
)

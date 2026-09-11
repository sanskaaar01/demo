import io
import os
import uuid
from datetime import datetime, timedelta
from urllib.parse import urlencode

import requests
import numpy as np
from PIL import Image, ImageEnhance, ImageStat


# ============================================================
# NASA GIBS CONFIGURATION
# ============================================================

GIBS_WMS = (
    "https://gibs.earthdata.nasa.gov/"
    "wms/epsg4326/best/wms.cgi"
)

LAYER = (
    "MODIS_Terra_CorrectedReflectance_TrueColor"
)

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

CACHE_DIR = os.path.join(
    BASE_DIR,
    "static",
    "imagery"
)

TIMEOUT = int(
    os.getenv(
        "SATELLITE_TIMEOUT",
        "25"
    )
)

os.makedirs(
    CACHE_DIR,
    exist_ok=True
)


# ============================================================
# LOCATION / BBOX
# ============================================================

def bbox_for_point(
    lat,
    lon,
    half_size=0.12
):
    """
    Create a small geographic bounding box
    around a latitude / longitude point.
    """

    west = max(
        -180,
        lon - half_size
    )

    south = max(
        -90,
        lat - half_size
    )

    east = min(
        180,
        lon + half_size
    )

    north = min(
        90,
        lat + half_size
    )

    return (
        west,
        south,
        east,
        north
    )


# ============================================================
# NASA GIBS WMS URL
# ============================================================

def gibs_url(
    date_str,
    bbox,
    width=900,
    height=600
):
    """
    Build a NASA GIBS WMS GetMap URL.
    """

    params = {

        "SERVICE": "WMS",

        "VERSION": "1.1.1",

        "REQUEST": "GetMap",

        "LAYERS": LAYER,

        "STYLES": "",

        "FORMAT": "image/png",

        "TRANSPARENT": "false",

        "SRS": "EPSG:4326",

        "WIDTH": width,

        "HEIGHT": height,

        "BBOX": ",".join(
            f"{value:.6f}"
            for value in bbox
        ),

        "TIME": date_str,
    }

    return (
        GIBS_WMS
        + "?"
        + urlencode(params)
    )


# ============================================================
# IMAGE VALIDATION
# ============================================================

def _is_usable(image):
    """
    Check whether the downloaded image
    contains usable visual information.
    """

    if (
        image.width < 100
        or image.height < 100
    ):
        return False

    rgb = image.convert(
        "RGB"
    )

    stat = ImageStat.Stat(
        rgb
    )

    means = stat.mean

    variation = (
        max(means)
        - min(means)
    )

    total = sum(means)

    return (
        variation > 1
        or total > 20
    )


# ============================================================
# DOWNLOAD NASA IMAGE
# ============================================================

def fetch_image(
    date_str,
    bbox
):
    """
    Retrieve satellite imagery from NASA GIBS
    and cache it locally.
    """

    url = gibs_url(
        date_str,
        bbox
    )

    response = requests.get(
        url,
        timeout=TIMEOUT,
        headers={
            "User-Agent":
                "SatQueryAI/2.0 "
                "(educational SIH prototype)"
        }
    )

    response.raise_for_status()

    image = Image.open(
        io.BytesIO(
            response.content
        )
    ).convert(
        "RGB"
    )

    if not _is_usable(
        image
    ):
        raise ValueError(
            "NASA GIBS returned "
            "an unusable image."
        )

    filename = (
        f"{uuid.uuid4().hex}"
        f"_{date_str}.png"
    )

    path = os.path.join(
        CACHE_DIR,
        filename
    )

    image.save(
        path,
        "PNG",
        optimize=True
    )

    return {

        "path": path,

        "filename": filename,

        "url":
            f"/imagery/{filename}",

        "date": date_str,

        "dataset": LAYER,

        "resolution":
            "~250 m browse imagery",

        "source":
            "NASA GIBS",

        "available": True,
    }


# ============================================================
# FIND IMAGE NEAR REQUESTED DATE
# ============================================================

def fetch_near_date(
    target_date,
    bbox,
    window=20
):
    """
    Try the requested date and nearby dates.
    """

    target = datetime.strptime(
        target_date,
        "%Y-%m-%d"
    ).date()

    offsets = [
        0,
        -3,
        3,
        -7,
        7,
        -14,
        14,
        -20,
        20
    ]

    last_error = None

    for offset in offsets:

        current_date = (
            target
            + timedelta(
                days=offset
            )
        )

        try:

            return fetch_image(
                current_date.isoformat(),
                bbox
            )

        except Exception as exc:

            last_error = exc

    raise RuntimeError(
        "No usable NASA GIBS imagery "
        f"found near {target_date}. "
        f"Last error: {last_error}"
    )


# ============================================================
# CHANGE DETECTION
# ============================================================

def change_detection(
    before_path,
    after_path
):
    """
    Perform normalized RGB pixel-distance
    change detection.

    This is a visual change proxy.
    It is NOT land-cover classification.
    """

    before = Image.open(
        before_path
    ).convert(
        "RGB"
    )

    after = Image.open(
        after_path
    ).convert(
        "RGB"
    )

    after = after.resize(
        before.size
    )

    a = (
        np.asarray(
            before,
            dtype=np.float32
        )
        / 255.0
    )

    b = (
        np.asarray(
            after,
            dtype=np.float32
        )
        / 255.0
    )

    # Per-pixel Euclidean RGB distance.
    diff = np.sqrt(
        np.mean(
            (a - b) ** 2,
            axis=2
        )
    )

    threshold = float(
        os.getenv(
            "CHANGE_THRESHOLD",
            "0.13"
        )
    )

    mask = (
        diff > threshold
    )

    percentage = float(
        mask.mean() * 100
    )

    # Create visual heat map.
    heat = np.clip(
        diff /
        max(
            threshold * 2.2,
            1e-6
        ),
        0,
        1
    )

    heat_array = (
        heat * 255
    ).astype(
        "uint8"
    )

    heat_image = Image.fromarray(
        heat_array,
        mode="L"
    ).convert(
        "RGB"
    )

    heat_image = (
        ImageEnhance
        .Contrast(
            heat_image
        )
        .enhance(1.4)
    )

    filename = (
        f"{uuid.uuid4().hex}"
        "_change.png"
    )

    path = os.path.join(
        CACHE_DIR,
        filename
    )

    heat_image.save(
        path,
        "PNG",
        optimize=True
    )

    if percentage >= 3:
        direction = (
            "landscape change"
        )
    else:
        direction = (
            "limited visible change"
        )

    return {

        "path": path,

        "filename": filename,

        "url":
            f"/imagery/{filename}",

        "change_percentage":
            percentage,

        "direction":
            direction,

        "threshold":
            threshold,

        "method":
            "normalized RGB "
            "color-distance threshold "
            "(visual proxy)",
    }


# ============================================================
# IMAGE TO DATA URL
# ============================================================

def image_to_data_url(
    path
):
    """
    Convert an image into a browser-safe
    data URL when required.
    """

    import base64

    extension = (
        os.path.splitext(
            path
        )[1]
        .lower()
    )

    mime = "image/png"

    if extension in [
        ".jpg",
        ".jpeg"
    ]:
        mime = "image/jpeg"

    with open(
        path,
        "rb"
    ) as file:

        encoded = base64.b64encode(
            file.read()
        ).decode(
            "ascii"
        )

    return (
        f"data:{mime};base64,"
        f"{encoded}"
    )
